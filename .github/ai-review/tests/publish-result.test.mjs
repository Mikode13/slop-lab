import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { perspectiveKeys, validateResult } from '../contract.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const publisher = join(here, '..', 'publish-result.mjs');
const stub = pathToFileURL(join(here, 'support', 'github-stub.mjs')).href;

const repository = 'Mikode13/slop-lab';
const base = 'a'.repeat(40);
const head = 'b'.repeat(40);

// One hunk that adds lines 1 to 3 of src/changed.js; src/untouched.js is not in the diff.
const diff = [
	'diff --git a/src/changed.js b/src/changed.js',
	'--- /dev/null',
	'+++ b/src/changed.js',
	'@@ -0,0 +1,3 @@',
	'+one',
	'+two',
	'+three',
	'',
].join('\n');

const blockingFinding = (id, path, line) => ({
	id,
	severity: 'BLOCKER',
	origin: 'introduced',
	blocking: true,
	title: `Blocking finding ${id}`,
	problem: 'The change introduces a defect.',
	consequence: 'The changed behaviour is wrong.',
	recommended_direction: 'Correct the defect.',
	location: { path, revision: head, line, symbol: null },
	evidence: [
		{
			source: { ref: path, revision: head },
			kind: 'inspected',
			observation: 'The defect is visible at this location.',
		},
	],
});

const note = (id, path, line) => ({
	...blockingFinding(id, path, line),
	severity: 'SUGGESTION',
	blocking: false,
	title: `Note ${id}`,
	problem: `A smaller issue ${id} remains.`,
});

const blockedResult = (findings, overrides) => ({
	version: 1,
	scope: { repository, base, head, paths: ['src/changed.js'] },
	outcome: 'blocked',
	perspectives: Object.fromEntries(
		perspectiveKeys.map(key => [
			key,
			{
				depth: 'baseline',
				coverage: 'complete',
				reason: 'Reviewed against the supplied evidence.',
				skills: [],
				finding_ids: key === 'correctness_regression' ? findings.map(finding => finding.id) : [],
			},
		]),
	),
	findings,
	verification: findings.map(finding => ({
		candidate_id: `candidate-${finding.id}`,
		disposition: 'confirmed',
		finding_id: finding.id,
		reason: 'Confirmed against the diff.',
		checked_sources: [],
	})),
	limitations: [],
	questions: [],
	context: [],
	follow_up: [],
	...overrides,
});

/**
 * Runs the publisher on a valid blocked result with `findings` and any `result` fields replaced,
 * `reviews` already on the pull request, `report` fields added to the analysis report, and `env`
 * passed to the stub. Returns its exit status and output, the posted review, the job summary, and
 * the threads it resolved.
 */
function publish(findings, { reviews = [], report = {}, result: fields = {}, env = {} } = {}) {
	const result = blockedResult(findings, fields);
	assert.deepEqual(validateResult(result, { repository, base, head }).errors, []);

	const directory = mkdtempSync(join(tmpdir(), 'ai-review-publish-'));
	const file = name => join(directory, name);
	writeFileSync(file('change.diff'), diff);
	writeFileSync(file('reviews.json'), JSON.stringify(reviews));

	const run = spawnSync(process.execPath, ['--import', stub, publisher], {
		encoding: 'utf8',
		env: {
			...process.env,
			ANALYZE_RESULT: 'success',
			BASE_SHA: base,
			GITHUB_STEP_SUMMARY: file('summary.md'),
			GITHUB_TOKEN: 'test-token',
			HEAD_SHA: head,
			PR_NUMBER: '7',
			REPORT: JSON.stringify({ valid: true, outcome: 'blocked', errors: [], result, ...report }),
			REPOSITORY: repository,
			STUB_DIFF: file('change.diff'),
			STUB_POSTED: file('posted.json'),
			STUB_RESOLVED: file('resolved.json'),
			STUB_REVIEWS: file('reviews.json'),
			...env,
		},
	});

	const read = (name, fallback) =>
		existsSync(file(name)) ? readFileSync(file(name), 'utf8') : fallback;
	return {
		status: run.status,
		stdout: run.stdout,
		review: JSON.parse(read('posted.json', 'null')),
		summary: read('summary.md', ''),
		resolved: JSON.parse(read('resolved.json', '[]')),
	};
}

test('a blocked review whose blocking findings all reach a conversation passes the check', () => {
	const { status, review, resolved } = publish([blockingFinding('F1', 'src/changed.js', 2)]);

	assert.equal(status, 0);
	assert.equal(review.comments.length, 1);
	assert.deepEqual(resolved, []);
});

test('a blocking finding without a diff position fails the check even when another one is published', () => {
	const { status, stdout, review } = publish([
		blockingFinding('F1', 'src/changed.js', 2),
		blockingFinding('F2', 'src/untouched.js', 5),
	]);

	assert.equal(status, 1);
	assert.equal(review.comments.length, 1);
	assert.match(review.body, /Blocking findings without a diff position/u);
	assert.match(stdout, /1 blocking finding\(s\) could not be published as a conversation/u);
});

const bot = { login: 'github-actions[bot]' };

test('a retry after an incomplete review publishes its conversations', () => {
	const earlier = {
		user: bot,
		body: `<!-- mikode-ai-review:${head} -->\n## AI review: incomplete`,
	};
	const { status, review } = publish([blockingFinding('F1', 'src/changed.js', 2)], {
		reviews: [earlier],
	});

	assert.equal(status, 0);
	assert.equal(review.comments.length, 1);
});

test('a repeated delivery of the same report is not published twice', () => {
	const findings = [blockingFinding('F1', 'src/changed.js', 2)];
	const first = publish(findings);
	const repeated = publish(findings, { reviews: [{ user: bot, body: first.review.body }] });

	assert.equal(repeated.status, 0);
	assert.equal(repeated.review, null);
});

test('a copy of the report posted by anyone else does not stop the publication', () => {
	const findings = [blockingFinding('F1', 'src/changed.js', 2)];
	const first = publish(findings);
	const copy = { user: { login: 'someone' }, body: first.review.body };
	const { status, review } = publish(findings, { reviews: [copy] });

	assert.equal(status, 0);
	assert.equal(review.comments.length, 1);
});

test('the summary lists a blocking finding with its line and leaves the reasoning to its comment', () => {
	const { review } = publish([blockingFinding('F1', 'src/changed.js', 2)]);

	assert.match(review.body, /Not ready to merge: 1 blocking finding\(s\)\./u);
	assert.match(review.body, /\*\*\[BLOCKER\] Blocking finding F1\*\* \(`src\/changed\.js:2`\)/u);
	assert.doesNotMatch(review.body, /The change introduces a defect\./u);
	assert.match(review.comments[0].body, /The change introduces a defect\./u);
});

test('a non-blocking finding on a diff line is commented there and resolved', () => {
	const { status, review, resolved } = publish([
		blockingFinding('F1', 'src/changed.js', 2),
		note('F2', 'src/changed.js', 3),
	]);

	assert.equal(status, 0);
	assert.equal(review.comments.length, 2);
	assert.equal(review.comments[1].line, 3);
	assert.match(review.comments[1].body, /A smaller issue F2 remains\./u);
	assert.deepEqual(resolved, ['thread-1']);
	assert.doesNotMatch(review.body, /A smaller issue F2 remains\./u);
	assert.match(review.body, /1 non-blocking finding\(s\) noted on their lines and resolved\./u);
});

test('a finding with no line in the diff is described in the summary instead', () => {
	const { review, resolved } = publish([
		blockingFinding('F1', 'src/changed.js', 2),
		note('F3', 'src/changed.js', 40),
	]);

	assert.equal(review.comments.length, 1);
	assert.deepEqual(resolved, []);
	assert.match(review.body, /### Findings without a line in the diff/u);
	assert.match(review.body, /`src\/changed\.js:40`\. A smaller issue F3 remains\./u);
});

test('follow-up that names a finding joins its comment, and the rest stays in the summary', () => {
	const { review } = publish([blockingFinding('F1', 'src/changed.js', 2)], {
		result: { follow_up: ['F1: Add a regression test.', 'Re-run the checks.'] },
	});

	assert.match(review.comments[0].body, /\*\*Follow-up\.\*\* Add a regression test\./u);
	assert.doesNotMatch(review.body, /Add a regression test/u);
	assert.match(review.body, /### Follow-up\n\n- Re-run the checks\./u);
});

test('the summary asks the questions and leaves the perspectives to the job summary', () => {
	const { review, summary } = publish([blockingFinding('F1', 'src/changed.js', 2)], {
		result: {
			questions: [
				{
					question: 'Is the wider rule intended?',
					perspective: 'intent_scope',
					prevents_completion: false,
				},
			],
		},
	});

	assert.match(review.body, /### Questions for the author\n\n- Is the wider rule intended\?/u);
	assert.doesNotMatch(review.body, /Perspectives|correctness_regression/u);
	assert.match(summary, /### Perspectives/u);
	assert.match(summary, /correctness_regression/u);
});

test('the reasons replies were rejected reach the job summary, not the pull request', () => {
	const { review, summary } = publish([blockingFinding('F1', 'src/changed.js', 2)], {
		report: {
			attempts: 2,
			repairReasons: ['findings[0].severity is not a known severity.'],
			failedRepairReasons: ['scope is missing.'],
		},
	});

	assert.match(summary, /### Reasons the first reply was rejected/u);
	assert.match(summary, /findings\[0\]\.severity is not a known severity\./u);
	assert.match(summary, /### Reasons the repair was rejected\n\n- scope is missing\./u);
	assert.doesNotMatch(review.body, /Reasons the/u);
});

test('non-blocking comments that cannot be resolved fail the check', () => {
	const { status, stdout, review } = publish(
		[blockingFinding('F1', 'src/changed.js', 2), note('F2', 'src/changed.js', 3)],
		{ env: { STUB_GRAPHQL_ERROR: 'Resource not accessible by integration' } },
	);

	assert.equal(status, 1);
	assert.equal(review.comments.length, 2);
	assert.match(
		stdout,
		/The non-blocking comments could not be resolved: Resource not accessible by integration/u,
	);
});
