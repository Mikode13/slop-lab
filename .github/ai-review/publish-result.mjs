/**
 * Publishes a validated review as one pull request review bound to the reviewed commit.
 *
 * This job holds write access and no provider credential, so it treats the analysis job's
 * output as data: it re-runs contract validation before believing an outcome, and it
 * neutralizes every string it renders. The three outcomes map to merge authority as the
 * automated review standard requires: `clean` and `blocked` both completed, so the check
 * succeeds for both, and only the unresolved conversations raised for blocking findings stop
 * the merge. `incomplete` fails the check.
 */

import { appendFileSync } from 'node:fs';

import { perspectiveKeys, validateResult } from './contract.mjs';

const environment = key => {
	const value = process.env[key];
	if (!value) throw new Error(`${key} is required`);
	return value;
};

const repository = environment('REPOSITORY');
const pullNumber = environment('PR_NUMBER');
const baseSha = environment('BASE_SHA');
const headSha = environment('HEAD_SHA');
const token = environment('GITHUB_TOKEN');
const analyzeResult = environment('ANALYZE_RESULT');

const marker = `<!-- mikode-ai-review:${headSha} -->`;
const pullPath = `/repos/${repository}/pulls/${pullNumber}`;

/** Neutralizes reviewer-authored text: no mentions, no raw HTML, no hidden comment markers. */
const sanitize = value =>
	String(value ?? '')
		.replace(/\s+/gu, ' ')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('@', '@​')
		.trim();

async function request(
	path,
	{ method = 'GET', body, accept = 'application/vnd.github+json' } = {},
) {
	const response = await fetch(`https://api.github.com${path}`, {
		method,
		headers: {
			accept,
			authorization: `Bearer ${token}`,
			'x-github-api-version': '2022-11-28',
			...(body ? { 'content-type': 'application/json' } : {}),
		},
		...(body ? { body } : {}),
	});
	if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}`);
	return accept.endsWith('diff') ? response.text() : response.json();
}

/**
 * Collects the lines of each file that GitHub accepts as a review comment position: the added
 * and context lines on the reviewed side of every hunk.
 */
function addressableLines(diff) {
	const files = new Map();
	let path = null;
	let line = 0;

	for (const text of diff.split('\n')) {
		if (text.startsWith('+++ ')) {
			const target = text.slice(4).trim();
			path = target === '/dev/null' ? null : target.replace(/^b\//u, '');
			if (path) files.set(path, new Set());
			continue;
		}
		const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(text);
		if (hunk) {
			line = Number(hunk[1]);
			continue;
		}
		if (path === null || text.startsWith('---') || text.startsWith('diff ')) continue;
		if (text.startsWith('+') || text.startsWith(' ')) {
			files.get(path).add(line);
			line += 1;
		}
	}
	return files;
}

const describeUsage = usage =>
	(usage ?? [])
		.map(entry => `${entry.inputTokens ?? '?'} in / ${entry.outputTokens ?? '?'} out`)
		.join('; ') || 'not reported';

/** Folds content a reader rarely needs below a one-line label. */
const folded = (label, items) => [
	'',
	`<details><summary>${label}</summary>`,
	'',
	...items,
	'',
	'</details>',
];

/**
 * Names every finding on one line. The reasoning of a finding that opened a conversation lives
 * only in that conversation, so the summary never repeats it; the reasoning of the others is
 * folded below the list.
 */
function renderSummary(report, conversations) {
	const lines = [marker, `## AI review: ${report.outcome}`, '', `Reviewed commit: ${headSha}`, ''];

	if (report.valid) {
		const { findings, perspectives } = report.result;
		const followUp = report.result.follow_up;

		lines.push('### Findings', '');
		if (findings.length === 0) lines.push('No verified findings.');
		for (const finding of findings) {
			const where = finding.location.line
				? `${finding.location.path}:${finding.location.line}`
				: finding.location.path;
			const conversation = conversations.has(finding.id) ? ', see its conversation' : '';
			lines.push(
				`- **[${finding.severity}] ${sanitize(finding.title)}** — ${finding.origin}, ` +
					`${finding.blocking ? 'blocking' : 'non-blocking'}, at \`${sanitize(where)}\`` +
					conversation,
			);
		}

		const withoutConversation = findings.filter(finding => !conversations.has(finding.id));
		if (withoutConversation.length > 0) {
			lines.push(
				...folded(
					'Findings without a conversation',
					withoutConversation.map(
						finding =>
							`- **${sanitize(finding.title)}** — ${sanitize(finding.problem)} ` +
							`Consequence: ${sanitize(finding.consequence)} ` +
							`Direction: ${sanitize(finding.recommended_direction)}`,
					),
				),
			);
		}

		lines.push('', '### Perspectives', '');
		for (const key of perspectiveKeys) {
			lines.push(`- **${key}** — ${perspectives[key].coverage} (${perspectives[key].depth})`);
		}
		lines.push(
			...folded(
				'How each perspective was reviewed',
				perspectiveKeys.map(key => `- **${key}**: ${sanitize(perspectives[key].reason)}`),
			),
		);

		if (followUp.length > 0) {
			lines.push(
				...folded(
					`Follow-up (${followUp.length})`,
					followUp.map(item => `- ${sanitize(item)}`),
				),
			);
		}
	} else {
		lines.push(
			'The review is incomplete: its execution or its result could not be trusted.',
			'',
			...(report.errors ?? []).map(error => `- ${sanitize(error)}`),
			'',
			'This is not a clean review, and it is not evidence that the change is safe.',
		);
	}

	if ((report.omissions ?? []).length > 0) {
		lines.push(
			'',
			'### Context not supplied to the reviewer',
			'',
			...report.omissions.map(omission => `- ${sanitize(omission)}`),
		);
	}

	lines.push(
		'',
		'---',
		`Automated pilot, ${report.attempts ?? 0} provider turn(s), ${describeUsage(report.usage)}.`,
		'A completed review is a second opinion, not proof that the change is correct.',
	);
	return lines.join('\n');
}

const findingComment = finding =>
	[
		`**[${finding.severity}] ${sanitize(finding.title)}**`,
		'',
		sanitize(finding.problem),
		'',
		`**Consequence.** ${sanitize(finding.consequence)}`,
		'',
		`**Direction.** ${sanitize(finding.recommended_direction)}`,
		'',
		'Resolve this conversation after correcting it, or record why it does not apply.',
	].join('\n');

const incomplete = (report, errors) => ({
	...report,
	valid: false,
	result: null,
	outcome: 'incomplete',
	errors,
});

// The analysis job may have failed before it produced anything, so an absent or unparseable
// report is a normal path here, not a crash.
let report;
try {
	report = JSON.parse(process.env.REPORT ?? '');
} catch {
	report = incomplete({}, ['The analysis job produced no result.']);
}

if (analyzeResult !== 'success') {
	report = incomplete(report, [
		`The analysis job ended as "${analyzeResult}".`,
		...(report.errors ?? []),
	]);
}

// The publisher never inherits the analysis job's verdict: it revalidates the result it is
// about to act on, so a report claiming "clean" without a result that earns it cannot pass.
if (report.valid) {
	const revalidated = validateResult(report.result, { repository, base: baseSha, head: headSha });
	if (!revalidated.valid) {
		report = incomplete(
			report,
			revalidated.errors.map(error => `On revalidation: ${error}`),
		);
	}
}

const blocking = report.valid ? report.result.findings.filter(finding => finding.blocking) : [];
const comments = [];
const conversations = new Set();
const unanchored = [];

if (blocking.length > 0) {
	const lines = addressableLines(
		await request(pullPath, { accept: 'application/vnd.github.diff' }),
	);
	for (const finding of blocking) {
		const addressable = lines.get(finding.location.path);
		const exact = addressable?.has(finding.location.line) ? finding.location.line : undefined;
		const line = exact ?? [...(addressable ?? [])].sort((first, second) => first - second)[0];
		if (line === undefined) {
			unanchored.push(finding);
			continue;
		}
		conversations.add(finding.id);
		comments.push({
			path: finding.location.path,
			line,
			side: 'RIGHT',
			body: findingComment(finding),
		});
	}
}

let body = renderSummary(report, conversations);
if (unanchored.length > 0) {
	body += `\n\n### Blocking findings without a diff position\n\n${unanchored
		.map(finding => `- ${sanitize(finding.title)} in \`${sanitize(finding.location.path)}\``)
		.join('\n')}`;
}

// Each execution decides the check from its own result, never from a review already on the pull
// request: any workflow allowed to write reviews could have posted one, and an earlier
// incomplete review must not stop a retry from publishing its conversations. Only a repeated
// delivery of this same report, such as a re-run of this job alone, is left unpublished.
const reviews = await request(`${pullPath}/reviews?per_page=100`);
const alreadyPublished = reviews.some(
	review => review.user?.login === 'github-actions[bot]' && review.body === body,
);

if (alreadyPublished) {
	console.log(`This report for ${headSha} is already published; not publishing it again.`);
} else {
	await request(`${pullPath}/reviews`, {
		method: 'POST',
		body: JSON.stringify({ commit_id: headSha, event: 'COMMENT', body, comments }),
	});
	console.log(`Published the review for ${headSha} with ${comments.length} conversation(s).`);
}

// Why a first reply failed validation matters for tuning the contract, not for the pull request,
// so only the job summary carries it.
const repairReasons = Array.isArray(report.repairReasons) ? report.repairReasons : [];
const repairNotes =
	repairReasons.length > 0
		? `\n\n### Reasons the first reply was rejected\n\n${repairReasons
				.map(reason => `- ${sanitize(reason)}`)
				.join('\n')}`
		: '';
appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}${repairNotes}\n`);

// Every blocking finding needs a conversation that someone has to resolve. One that reached
// none would leave part of the merge authority unenforced, so the check fails even when other
// blocking findings were published.
const unenforceable = unanchored.length > 0;
if (unenforceable) {
	console.log(`${unanchored.length} blocking finding(s) could not be published as a conversation.`);
}

console.log(`Outcome: ${report.outcome}.`);
if (process.env.GITHUB_OUTPUT)
	appendFileSync(process.env.GITHUB_OUTPUT, `outcome=${report.outcome}\n`);
process.exit(report.outcome === 'incomplete' || unenforceable ? 1 : 0);
