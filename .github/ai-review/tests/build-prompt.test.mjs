import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const builder = join(here, '..', 'build-prompt.mjs');
const runner = join(here, '..', 'run-reviewer.mjs');

const base = 'a'.repeat(40);
const head = 'b'.repeat(40);

const write = (path, content) => {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
};

/** Lays out the directories the workflow prepares, with the given files changed at head. */
function workspace(changed) {
	const root = mkdtempSync(join(tmpdir(), 'ai-review-build-'));
	const directories = Object.fromEntries(
		['base', 'evidence', 'head', 'policy', 'skill', 'work'].map(name => [name, join(root, name)]),
	);
	for (const directory of Object.values(directories)) mkdirSync(directory, { recursive: true });

	write(join(directories.base, 'AGENTS.md'), 'Trusted repository instructions.\n');
	write(join(directories.skill, 'skills/mikode-review/SKILL.md'), 'Review skill.\n');
	write(join(directories.skill, 'skills/mikode-review/references/contract.md'), 'Contract.\n');
	write(
		join(directories.evidence, 'pull-request.json'),
		JSON.stringify({ html_url: 'https://github.com/example/pull/1', body: 'Goal: a change.' }),
	);
	write(join(directories.evidence, 'change.diff'), 'diff --git a/x b/x\n');
	write(join(directories.evidence, 'changed-files.txt'), `${Object.keys(changed).join('\n')}\n`);
	for (const [path, content] of Object.entries(changed))
		write(join(directories.head, path), content);

	return directories;
}

function environment(directories, overrides = {}) {
	return {
		...process.env,
		BASE_DIR: directories.base,
		BASE_SHA: base,
		EVIDENCE_DIR: directories.evidence,
		HEAD_DIR: directories.head,
		HEAD_SHA: head,
		OUTPUT_DIR: directories.work,
		POLICY_DIR: directories.policy,
		POLICY_REVISION: 'policy-revision',
		REPOSITORY: 'Mikode13/slop-lab',
		SKILL_DIR: directories.skill,
		...overrides,
	};
}

function build(directories, overrides) {
	const run = spawnSync(process.execPath, [builder], {
		encoding: 'utf8',
		env: environment(directories, overrides),
	});
	assert.equal(run.status, 0, run.stderr);
	return JSON.parse(readFileSync(join(directories.work, 'build-report.json'), 'utf8'));
}

test('reviewed files within the file limit are supplied whole and the build fits', () => {
	const report = build(workspace({ 'src/small.js': 'export const small = 1;\n' }), {
		FILE_LIMIT: '1000',
	});

	assert.equal(report.fits, true);
	assert.deepEqual(report.missingEssentials, []);
});

test('a reviewed file over the file limit makes the build unfit instead of being dropped silently', () => {
	const report = build(
		workspace({
			'src/small.js': 'export const small = 1;\n',
			'src/large.js': `${'// padding\n'.repeat(200)}`,
		}),
		{ FILE_LIMIT: '1000' },
	);

	assert.equal(report.fits, false);
	assert.equal(report.missingEssentials.length, 1);
	assert.match(report.missingEssentials[0], /src\/large\.js.*1000-byte file limit/u);
});

test('a changed lockfile is reviewed through its diff and never counts as an oversized file', () => {
	const directories = workspace({
		'package.json': '{ "name": "example" }\n',
		'pnpm-lock.yaml': `lockfileVersion: '9.0'\n${'# resolution\n'.repeat(200)}`,
	});
	const report = build(directories, { FILE_LIMIT: '1000' });
	const prompt = readFileSync(join(directories.work, 'prompt.txt'), 'utf8');

	assert.equal(report.fits, true);
	assert.deepEqual(report.missingEssentials, []);
	assert.doesNotMatch(prompt, /# resolution/u);
	assert.match(prompt, /intentionally not supplied: pnpm-lock\.yaml/u);
});

test('a budget spent by the mandatory sections never produces a build that fits', () => {
	const directories = workspace({ 'src/small.js': 'export const small = 1;\n' });
	const mandatoryOnly = build(directories, { PROMPT_LIMIT: '1' }).bytes;

	// Within the space reserved for declared omissions, so the prompt itself would still fit.
	const report = build(directories, { PROMPT_LIMIT: String(mandatoryOnly + 10) });

	assert.equal(report.fits, false);
	assert.ok(report.missingEssentials.length > 0);
});

test('the runner never calls the provider for a build that does not fit', () => {
	const directories = workspace({ 'src/large.js': `${'// padding\n'.repeat(200)}` });
	build(directories, { FILE_LIMIT: '1000' });

	const run = spawnSync(process.execPath, [runner], {
		encoding: 'utf8',
		env: environment(directories, {
			GITHUB_OUTPUT: join(directories.work, 'github-output'),
			REVIEWER_COMMAND: join(directories.work, 'must-not-run'),
		}),
	});
	assert.equal(run.status, 0, run.stderr);

	const report = JSON.parse(readFileSync(join(directories.work, 'review-report.json'), 'utf8'));
	assert.equal(report.outcome, 'incomplete');
	assert.equal(report.attempts, 0);
	assert.match(report.errors[0], /src\/large\.js/u);
});
