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

const blockedResult = findings => ({
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
});

/**
 * Runs the publisher on a valid blocked result, with `reviews` already on the pull request and
 * `report` fields added to the analysis report, and returns its exit status, posted review, and
 * job summary.
 */
function publish(findings, { reviews = [], report = {} } = {}) {
	const result = blockedResult(findings);
	assert.deepEqual(validateResult(result, { repository, base, head }).errors, []);

	const directory = mkdtempSync(join(tmpdir(), 'ai-review-publish-'));
	const posted = join(directory, 'posted.json');
	writeFileSync(join(directory, 'change.diff'), diff);
	writeFileSync(join(directory, 'reviews.json'), JSON.stringify(reviews));

	const run = spawnSync(process.execPath, ['--import', stub, publisher], {
		encoding: 'utf8',
		env: {
			...process.env,
			ANALYZE_RESULT: 'success',
			BASE_SHA: base,
			GITHUB_STEP_SUMMARY: join(directory, 'summary.md'),
			GITHUB_TOKEN: 'test-token',
			HEAD_SHA: head,
			PR_NUMBER: '7',
			REPORT: JSON.stringify({ valid: true, outcome: 'blocked', errors: [], result, ...report }),
			REPOSITORY: repository,
			STUB_DIFF: join(directory, 'change.diff'),
			STUB_POSTED: posted,
			STUB_REVIEWS: join(directory, 'reviews.json'),
		},
	});

	const review = existsSync(posted) ? JSON.parse(readFileSync(posted, 'utf8')) : null;
	const summaryPath = join(directory, 'summary.md');
	const summary = existsSync(summaryPath) ? readFileSync(summaryPath, 'utf8') : '';
	return { status: run.status, stdout: run.stdout, review, summary };
}

test('a blocked review whose blocking findings all reach a conversation passes the check', () => {
	const { status, review } = publish([blockingFinding('F1', 'src/changed.js', 2)]);

	assert.equal(status, 0);
	assert.equal(review.comments.length, 1);
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

test('the summary names a finding with a conversation without repeating its reasoning', () => {
	const { review } = publish([blockingFinding('F1', 'src/changed.js', 2)]);

	assert.match(
		review.body,
		/Blocking finding F1\*\* — introduced, blocking, at `src\/changed\.js:2`, see its conversation/u,
	);
	assert.doesNotMatch(review.body, /The change introduces a defect\./u);
	assert.match(review.comments[0].body, /The change introduces a defect\./u);
});

test('a finding without a conversation keeps its reasoning in the summary', () => {
	const suggestion = {
		...blockingFinding('F2', 'src/changed.js', 3),
		severity: 'SUGGESTION',
		blocking: false,
		problem: 'A smaller issue remains.',
	};
	const { review } = publish([blockingFinding('F1', 'src/changed.js', 2), suggestion]);

	assert.equal(review.comments.length, 1);
	assert.match(review.body, /<details><summary>Findings without a conversation<\/summary>/u);
	assert.match(review.body, /A smaller issue remains\./u);
});

test('the reasons a first reply was rejected reach the job summary, not the pull request', () => {
	const { review, summary } = publish([blockingFinding('F1', 'src/changed.js', 2)], {
		report: { attempts: 2, repairReasons: ['findings[0].severity is not a known severity.'] },
	});

	assert.match(summary, /Reasons the first reply was rejected/u);
	assert.match(summary, /findings\[0\]\.severity is not a known severity\./u);
	assert.doesNotMatch(review.body, /Reasons the first reply was rejected/u);
});
