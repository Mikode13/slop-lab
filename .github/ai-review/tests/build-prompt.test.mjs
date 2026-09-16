import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { perspectiveKeys, validateResult } from '../contract.mjs';

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

test('the code review is supplied with the philosophy it reviews against', () => {
	const directories = workspace({ 'src/small.js': 'export const small = 1;\n' });
	write(
		join(directories.skill, 'skills/mikode-code-philosophy-review/SKILL.md'),
		'Code review method.\n',
	);
	write(join(directories.skill, 'skills/mikode-code-philosophy/SKILL.md'), 'Code criteria.\n');
	build(directories);
	const prompt = readFileSync(join(directories.work, 'prompt.txt'), 'utf8');

	assert.match(prompt, /===== Code review guidance \(pinned\) =====\nCode review method\./u);
	assert.match(
		prompt,
		/===== Code philosophy the code review applies \(pinned\) =====\nCode criteria\./u,
	);
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

test('the reasons a reply needed repair are recorded even when the repair succeeds', () => {
	const directories = workspace({ 'src/small.js': 'export const small = 1;\n' });
	build(directories);

	const repository = 'Mikode13/slop-lab';
	const clean = {
		version: 1,
		scope: { repository, base, head, paths: ['src/small.js'] },
		outcome: 'clean',
		perspectives: Object.fromEntries(
			perspectiveKeys.map(key => [
				key,
				{
					depth: 'baseline',
					coverage: 'complete',
					reason: 'Reviewed.',
					skills: [],
					finding_ids: [],
				},
			]),
		),
		findings: [],
		verification: [],
		limitations: [],
		questions: [],
		context: [],
		follow_up: [],
	};
	assert.deepEqual(validateResult(clean, { repository, base, head }).errors, []);

	// Answers the first turn with an object the contract rejects, and the repair with a valid one.
	const reviewer = join(directories.work, 'reviewer.mjs');
	const answered = join(directories.work, 'answered');
	write(
		reviewer,
		[
			'#!/usr/bin/env node',
			"import { existsSync, writeFileSync } from 'node:fs';",
			`const first = !existsSync(${JSON.stringify(answered)});`,
			`writeFileSync(${JSON.stringify(answered)}, '');`,
			`const response = first ? '{"version": 1}' : ${JSON.stringify(JSON.stringify(clean))};`,
			'process.stdout.write(JSON.stringify({ response, inputTokens: 1, outputTokens: 1, duration: 1 }));',
			'',
		].join('\n'),
	);
	chmodSync(reviewer, 0o755);

	const run = spawnSync(process.execPath, [runner], {
		encoding: 'utf8',
		env: environment(directories, {
			GITHUB_OUTPUT: join(directories.work, 'github-output'),
			REVIEWER_COMMAND: reviewer,
		}),
	});
	assert.equal(run.status, 0, run.stderr);

	const report = JSON.parse(readFileSync(join(directories.work, 'review-report.json'), 'utf8'));
	assert.equal(report.outcome, 'clean');
	assert.equal(report.attempts, 2);
	assert.ok(report.repairReasons.length > 0);
	assert.match(run.stdout, /Rejected before repair: /u);
});
