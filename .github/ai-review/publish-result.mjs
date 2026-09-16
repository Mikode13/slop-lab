/**
 * Publishes a validated review as one pull request review bound to the reviewed commit.
 *
 * This job holds write access and no provider credential, so it treats the analysis job's
 * output as data: it re-runs contract validation before believing an outcome, and it
 * neutralizes every string it renders. The three outcomes map to merge authority as the
 * automated review standard requires: `clean` and `blocked` both completed, so the check
 * succeeds for both, and only the unresolved conversations raised for blocking findings stop
 * the merge. `incomplete` fails the check.
 *
 * A finding is shown where a person reviewing by hand would put it: on its line of the diff.
 * A blocking finding's conversation stays open. A non-blocking finding is commented the same
 * way and then resolved, so it is visible on its line without holding the merge back. Only what
 * has no line in the diff, and the verdict, go in the summary.
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
// Marks a non-blocking comment, which is the only kind of thread this job ever resolves.
const noteMarker = `<!-- mikode-ai-review-note:${headSha} -->`;
const pullPath = `/repos/${repository}/pulls/${pullNumber}`;
const botLogins = new Set(['github-actions', 'github-actions[bot]']);

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

async function graphql(query, variables) {
	const response = await request('/graphql', {
		method: 'POST',
		body: JSON.stringify({ query, variables }),
	});
	if (response.errors?.length) {
		throw new Error(response.errors.map(error => error.message).join('; '));
	}
	return response.data;
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

const origins = {
	introduced: 'introduced',
	pre_existing: 'pre-existing',
	unknown: 'unknown origin',
};

const heading = finding =>
	`**[${finding.severity ?? 'UNCLASSIFIED'}] ${sanitize(finding.title)}** · ` +
	`${origins[finding.origin] ?? sanitize(finding.origin)} · ` +
	`${finding.blocking ? 'blocking' : 'non-blocking'}`;

const where = location =>
	location?.line ? `${location.path}:${location.line}` : (location?.path ?? 'no file');

/** Follow-up items that start with the ids of findings, such as "F1: ..." or "F2, F3: ...". */
function splitFollowUp(items, findings) {
	const ids = new Set(findings.map(finding => finding.id));
	const byFinding = new Map();
	const general = [];

	for (const item of items) {
		const prefixed = /^([^:]{1,80}):\s*(.+)$/su.exec(item);
		const named = prefixed ? prefixed[1].split(/[\s,]+/u).filter(Boolean) : [];
		if (named.length > 0 && named.every(id => ids.has(id))) {
			for (const id of named) byFinding.set(id, [...(byFinding.get(id) ?? []), prefixed[2]]);
		} else {
			general.push(item);
		}
	}
	return { byFinding, general };
}

const reasoning = (finding, followUp) => [
	sanitize(finding.problem),
	'',
	`**Consequence.** ${sanitize(finding.consequence)}`,
	'',
	`**Direction.** ${sanitize(finding.recommended_direction)}`,
	...followUp.flatMap(item => ['', `**Follow-up.** ${sanitize(item)}`]),
];

function findingComment(finding, followUp, reportedLine) {
	return [
		heading(finding),
		'',
		...(reportedLine ? [`Reported for line ${reportedLine}, which is outside the diff.`, ''] : []),
		...reasoning(finding, followUp),
		'',
		finding.blocking
			? 'Resolve this conversation after correcting it, or record why it does not apply.'
			: `Non-blocking, so it was resolved when it was published. Reopen it to discuss it.\n${noteMarker}`,
	].join('\n');
}

const summaryEntry = (finding, followUp) =>
	`- ${heading(finding)} · \`${sanitize(where(finding.location))}\`. ` +
	reasoning(finding, followUp)
		.filter(text => text !== '')
		.join(' ');

const section = (title, items) => (items.length > 0 ? ['', `### ${title}`, '', ...items] : []);

function formatDuration(usage) {
	const seconds = (usage ?? []).reduce((total, entry) => total + (entry.duration ?? 0), 0);
	if (seconds <= 0) return null;
	const rounded = Math.round(seconds);
	return rounded < 60 ? `${rounded} s` : `${Math.floor(rounded / 60)} min ${rounded % 60} s`;
}

function verdict(report, placed) {
	if (!report.valid) {
		return [
			'Incomplete: the review could not be completed or its result could not be trusted, so ' +
				'it is not evidence that the change is safe.',
			'',
			...(report.errors ?? []).map(error => `- ${sanitize(error)}`),
		];
	}

	const lines = [];
	const open = placed.blocking;
	if (report.outcome === 'incomplete') {
		lines.push(
			'Incomplete: the review could not cover everything it needed, so it is not evidence ' +
				'that the change is safe.',
		);
	} else if (open.length > 0 || placed.unanchored.length > 0) {
		lines.push(
			`Not ready to merge: ${open.length + placed.unanchored.length} blocking finding(s).`,
		);
	} else {
		lines.push('No blocking findings.');
	}

	if (open.length > 0) {
		lines.push(
			'',
			...open.map(
				({ finding, line }) =>
					`- **[${finding.severity ?? 'UNCLASSIFIED'}] ${sanitize(finding.title)}** ` +
					`(\`${sanitize(finding.location.path)}:${finding.location.line ?? line}\`)`,
			),
		);
	}
	if (placed.notes.length > 0) {
		lines.push(
			'',
			`${placed.notes.length} non-blocking finding(s) noted on their lines and resolved.`,
		);
	}
	return lines;
}

function renderSummary(report, placed, followUp) {
	const result = report.valid ? report.result : null;
	const byFinding = finding => followUp.byFinding.get(finding.id) ?? [];

	const lines = [
		marker,
		`## AI review: ${report.outcome}`,
		'',
		...verdict(report, placed),
		...section(
			'Blocking findings without a diff position',
			placed.unanchored.map(finding => summaryEntry(finding, byFinding(finding))),
		),
		...section(
			'Findings without a line in the diff',
			placed.withoutLine.map(finding => summaryEntry(finding, byFinding(finding))),
		),
		...section(
			'Questions for the author',
			(result?.questions ?? []).map(
				question =>
					`- ${sanitize(question.question)}` +
					(question.prevents_completion ? ' This question kept the review from completing.' : ''),
			),
		),
		...section(
			'Limitations',
			(result?.limitations ?? []).map(
				limitation => `- ${sanitize(limitation.reason)} Needed: ${sanitize(limitation.needed)}`,
			),
		),
		...section(
			'Follow-up',
			followUp.general.map(item => `- ${sanitize(item)}`),
		),
		...section(
			'Context not supplied to the reviewer',
			(report.omissions ?? []).map(omission => `- ${sanitize(omission)}`),
		),
		'',
		'---',
		[
			`Commit ${headSha.slice(0, 7)}`,
			`${report.attempts ?? 0} provider turn(s)`,
			formatDuration(report.usage),
		]
			.filter(Boolean)
			.join(' · '),
	];
	return lines.join('\n');
}

/** What only the people running the pilot need: coverage and why replies were rejected. */
function renderOperatorNotes(report) {
	const reasons = key => (Array.isArray(report[key]) ? report[key] : []);
	const perspectives = report.valid ? report.result.perspectives : null;

	return [
		...section(
			'Perspectives',
			perspectives
				? perspectiveKeys.map(
						key =>
							`- **${key}** — ${perspectives[key].coverage} (${perspectives[key].depth}): ` +
							sanitize(perspectives[key].reason),
					)
				: [],
		),
		...section(
			'Reasons the first reply was rejected',
			reasons('repairReasons').map(reason => `- ${sanitize(reason)}`),
		),
		...section(
			'Reasons the repair was rejected',
			reasons('failedRepairReasons').map(reason => `- ${sanitize(reason)}`),
		),
	].join('\n');
}

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

const findings = report.valid ? report.result.findings : [];
const followUp = splitFollowUp(report.valid ? report.result.follow_up : [], findings);
const placed = { blocking: [], notes: [], withoutLine: [], unanchored: [] };
const comments = [];

if (findings.length > 0) {
	const lines = addressableLines(
		await request(pullPath, { accept: 'application/vnd.github.diff' }),
	);
	for (const finding of findings) {
		const addressable = lines.get(finding.location?.path);
		const exact = addressable?.has(finding.location.line) ? finding.location.line : undefined;
		const followUpItems = followUp.byFinding.get(finding.id) ?? [];

		if (finding.blocking) {
			// A blocking finding needs a conversation even when its exact line is outside the diff,
			// so it moves to the file's first commentable line and says which line it means.
			const line = exact ?? [...(addressable ?? [])].sort((first, second) => first - second)[0];
			if (line === undefined) {
				placed.unanchored.push(finding);
				continue;
			}
			const reportedLine = exact === undefined ? finding.location.line : null;
			placed.blocking.push({ finding, line });
			comments.push({
				path: finding.location.path,
				line,
				side: 'RIGHT',
				body: findingComment(finding, followUpItems, reportedLine),
			});
		} else if (exact === undefined) {
			// A comment on another line would point at code the finding is not about.
			placed.withoutLine.push(finding);
		} else {
			placed.notes.push(finding);
			comments.push({
				path: finding.location.path,
				line: exact,
				side: 'RIGHT',
				body: findingComment(finding, followUpItems, null),
			});
		}
	}
}

const body = renderSummary(report, placed, followUp);

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
	console.log(`Published the review for ${headSha} with ${comments.length} comment(s).`);
}

// A non-blocking comment left open would hold the merge back like a blocking one, because the
// ruleset requires every conversation to be resolved. Success is counted, not assumed: every
// comment this job posted has to be found and resolved, or the check fails and says why.
let notesLeftOpen = false;
if (placed.notes.length > 0) {
	const [owner, name] = repository.split('/');
	const threadsQuery = `
		query ($owner: String!, $name: String!, $number: Int!, $after: String) {
			repository(owner: $owner, name: $name) {
				pullRequest(number: $number) {
					reviewThreads(first: 100, after: $after) {
						pageInfo { hasNextPage endCursor }
						nodes { id isResolved comments(first: 1) { nodes { body author { login } } } }
					}
				}
			}
		}
	`;
	const resolveMutation = `
		mutation ($threadId: ID!) {
			resolveReviewThread(input: { threadId: $threadId }) { thread { id } }
		}
	`;
	const isNote = thread => {
		const first = thread.comments.nodes[0];
		return botLogins.has(first?.author?.login) && (first?.body ?? '').includes(noteMarker);
	};
	const notesFrom = async after => {
		const data = await graphql(threadsQuery, { owner, name, number: Number(pullNumber), after });
		const { nodes, pageInfo } = data.repository.pullRequest.reviewThreads;
		const found = nodes.filter(isNote);
		return pageInfo.hasNextPage ? [...found, ...(await notesFrom(pageInfo.endCursor))] : found;
	};

	try {
		const threads = await notesFrom(null);
		if (threads.length < placed.notes.length) {
			throw new Error(
				`found ${threads.length} of the ${placed.notes.length} non-blocking comment(s) posted`,
			);
		}
		const open = threads.filter(thread => !thread.isResolved);
		await Promise.all(open.map(thread => graphql(resolveMutation, { threadId: thread.id })));
		console.log(
			`Resolved ${open.length} non-blocking comment(s); ${threads.length - open.length} already were.`,
		);
	} catch (error) {
		notesLeftOpen = true;
		console.log(
			`The non-blocking comments could not be resolved: ${sanitize(error instanceof Error ? error.message : error)}. ` +
				'Re-run the failed jobs to try again.',
		);
	}
}

appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n${renderOperatorNotes(report)}\n`);

// Every blocking finding needs a conversation that someone has to resolve. One that reached
// none would leave part of the merge authority unenforced, so the check fails even when other
// blocking findings were published.
const unenforceable = placed.unanchored.length > 0;
if (unenforceable) {
	console.log(
		`${placed.unanchored.length} blocking finding(s) could not be published as a conversation.`,
	);
}

console.log(`Outcome: ${report.outcome}.`);
if (process.env.GITHUB_OUTPUT)
	appendFileSync(process.env.GITHUB_OUTPUT, `outcome=${report.outcome}\n`);
process.exit(report.outcome === 'incomplete' || unenforceable || notesLeftOpen ? 1 : 0);
