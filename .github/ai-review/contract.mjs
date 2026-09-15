/**
 * Version 1 of the `mikode-review` result contract, as published at the pinned skills
 * revision recorded in the workflow.
 *
 * The reviewer is asked to validate its own output, and a self-check is not proof of
 * behaviour, so the pilot re-derives every semantic rule here. Both the analysis job and
 * the publication job use this module, which keeps a result that reaches a pull request
 * from being trusted on a weaker check than the one that decided to accept it.
 */

export const perspectiveKeys = [
	'intent_scope',
	'correctness_regression',
	'design_architecture',
	'security_reliability',
	'evidence_delivery',
];

export const outcomes = ['clean', 'blocked', 'incomplete'];

const resultKeys = [
	'context',
	'findings',
	'follow_up',
	'limitations',
	'outcome',
	'perspectives',
	'questions',
	'scope',
	'verification',
	'version',
];

const severities = ['BLOCKER', 'SHOULD FIX', 'SUGGESTION'];
const blockingSeverities = new Set(['BLOCKER', 'SHOULD FIX']);
const origins = ['introduced', 'pre_existing', 'unknown'];
const depths = ['baseline', 'deep'];
const coverages = ['complete', 'incomplete', 'not_applicable'];
const dispositions = ['confirmed', 'duplicate', 'rejected', 'unresolved'];
const evidenceKinds = ['inspected', 'reported', 'executed'];

const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonEmptyString = value => typeof value === 'string' && value.trim() !== '';
const isNullableString = value => value === null || isNonEmptyString(value);
const exactKeys = (value, keys) =>
	isObject(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());

/**
 * Derives the outcome the contract requires for this result. `incomplete` takes precedence
 * over `blocked` so that unfinished review work can never present itself as a decision.
 */
export function deriveOutcome(result) {
	const incomplete =
		result.limitations.length > 0 ||
		perspectiveKeys.some(key => result.perspectives[key]?.coverage === 'incomplete') ||
		result.verification.some(item => item.disposition === 'unresolved') ||
		result.findings.some(
			finding =>
				finding.severity === null ||
				(finding.origin === 'unknown' && blockingSeverities.has(finding.severity)),
		);

	if (incomplete) return 'incomplete';
	return result.findings.some(finding => finding.blocking === true) ? 'blocked' : 'clean';
}

function createCollector() {
	const errors = [];
	return {
		errors,
		check(condition, message) {
			if (!condition) errors.push(message);
			return condition;
		},
	};
}

function checkSource(collect, value, where) {
	if (!collect.check(exactKeys(value, ['ref', 'revision']), `${where} is not a source.`)) return;
	collect.check(isNonEmptyString(value.ref), `${where} has no reference.`);
	collect.check(isNullableString(value.revision), `${where} has an invalid revision.`);
}

function checkEvidence(collect, value, where) {
	const shape = exactKeys(value, ['source', 'kind', 'observation']);
	if (!collect.check(shape, `${where} is not an evidence record.`)) return;
	checkSource(collect, value.source, `${where} source`);
	collect.check(evidenceKinds.includes(value.kind), `${where} has an invalid evidence kind.`);
	collect.check(isNonEmptyString(value.observation), `${where} has no observation.`);
}

function checkScope(collect, result, expected) {
	const shape = exactKeys(result.scope, ['repository', 'base', 'head', 'paths']);
	if (!collect.check(shape, 'The result scope has missing or unexpected fields.')) return;

	const { repository, base, head, paths } = result.scope;
	collect.check(repository === expected.repository, 'The result names a different repository.');
	collect.check(base === expected.base, 'The result names a different base commit.');
	collect.check(head === expected.head, 'The result names a different head commit.');
	collect.check(
		Array.isArray(paths) && paths.every(isNonEmptyString),
		'The result scope paths are invalid.',
	);
}

function checkPerspectives(collect, result, findingIds) {
	const shape = exactKeys(result.perspectives, perspectiveKeys);
	if (!collect.check(shape, 'The result must contain exactly the five review perspectives.')) {
		return;
	}

	for (const key of perspectiveKeys) {
		const perspective = result.perspectives[key];
		const fields = ['depth', 'coverage', 'reason', 'skills', 'finding_ids'];
		if (!collect.check(exactKeys(perspective, fields), `Perspective ${key} has invalid fields.`)) {
			continue;
		}

		collect.check(depths.includes(perspective.depth), `Perspective ${key} has an invalid depth.`);
		collect.check(
			coverages.includes(perspective.coverage),
			`Perspective ${key} has an invalid coverage.`,
		);
		collect.check(isNonEmptyString(perspective.reason), `Perspective ${key} has no reason.`);
		collect.check(
			Array.isArray(perspective.skills) && perspective.skills.every(isNonEmptyString),
			`Perspective ${key} lists invalid skills.`,
		);

		const references = perspective.finding_ids;
		if (!collect.check(Array.isArray(references), `Perspective ${key} has invalid finding IDs.`)) {
			continue;
		}
		for (const id of references) {
			collect.check(findingIds.has(id), `Perspective ${key} references the unknown finding ${id}.`);
		}
		collect.check(
			perspective.coverage !== 'not_applicable' || references.length === 0,
			`Perspective ${key} is not applicable but carries findings.`,
		);
	}
}

function checkFinding(collect, finding, index, seen) {
	const fields = [
		'id',
		'severity',
		'origin',
		'blocking',
		'title',
		'problem',
		'consequence',
		'recommended_direction',
		'location',
		'evidence',
	];
	const where = `Finding ${index + 1}`;
	if (!collect.check(exactKeys(finding, fields), `${where} has missing or unexpected fields.`)) {
		return;
	}

	if (collect.check(isNonEmptyString(finding.id), `${where} has no ID.`)) {
		collect.check(!seen.has(finding.id), `Finding IDs must be unique; ${finding.id} repeats.`);
		seen.add(finding.id);
	}

	collect.check(
		finding.severity === null || severities.includes(finding.severity),
		`${where} has an invalid severity.`,
	);
	collect.check(origins.includes(finding.origin), `${where} has an invalid origin.`);

	const expectedBlocking =
		finding.origin === 'introduced' && blockingSeverities.has(finding.severity);
	collect.check(
		finding.blocking === expectedBlocking,
		`${where} derives its blocking status from something other than severity and origin.`,
	);

	for (const field of ['title', 'problem', 'consequence', 'recommended_direction']) {
		collect.check(isNonEmptyString(finding[field]), `${where} has an empty ${field}.`);
	}

	const location = finding.location;
	if (
		collect.check(
			exactKeys(location, ['path', 'revision', 'line', 'symbol']),
			`${where} has an invalid location.`,
		)
	) {
		collect.check(isNonEmptyString(location.path), `${where} has no location path.`);
		collect.check(
			isNullableString(location.revision),
			`${where} has an invalid location revision.`,
		);
		collect.check(
			location.line === null || (Number.isInteger(location.line) && location.line >= 1),
			`${where} has an invalid location line.`,
		);
		collect.check(isNullableString(location.symbol), `${where} has an invalid location symbol.`);
	}

	const evidence = finding.evidence;
	if (collect.check(Array.isArray(evidence) && evidence.length > 0, `${where} has no evidence.`)) {
		evidence.forEach((item, position) =>
			checkEvidence(collect, item, `${where} evidence ${position + 1}`),
		);
	}
}

function checkVerification(collect, result, findingIds) {
	if (!collect.check(Array.isArray(result.verification), 'Verification must be an array.')) return;

	const candidates = new Set();
	const confirmed = new Set();

	result.verification.forEach((item, index) => {
		const fields = ['candidate_id', 'disposition', 'finding_id', 'reason', 'checked_sources'];
		const where = `Verification ${index + 1}`;
		if (!collect.check(exactKeys(item, fields), `${where} has missing or unexpected fields.`)) {
			return;
		}

		if (collect.check(isNonEmptyString(item.candidate_id), `${where} has no candidate ID.`)) {
			collect.check(!candidates.has(item.candidate_id), `${where} repeats a candidate ID.`);
			candidates.add(item.candidate_id);
		}

		collect.check(dispositions.includes(item.disposition), `${where} has an invalid disposition.`);
		collect.check(isNonEmptyString(item.reason), `${where} has no reason.`);

		if (item.disposition === 'confirmed' || item.disposition === 'duplicate') {
			const known = findingIds.has(item.finding_id);
			collect.check(known, `${where} points at an unknown finding.`);
			if (known && item.disposition === 'confirmed') confirmed.add(item.finding_id);
		} else {
			collect.check(item.finding_id === null, `${where} must not point at a finding.`);
		}

		if (collect.check(Array.isArray(item.checked_sources), `${where} has invalid sources.`)) {
			item.checked_sources.forEach((source, position) =>
				checkSource(collect, source, `${where} source ${position + 1}`),
			);
		}
	});

	for (const id of findingIds) {
		collect.check(confirmed.has(id), `Finding ${id} was never confirmed by a verified candidate.`);
	}
}

function checkQuestionsAndLimitations(collect, result) {
	const limited = new Set();

	if (collect.check(Array.isArray(result.limitations), 'Limitations must be an array.')) {
		result.limitations.forEach((limitation, index) => {
			const where = `Limitation ${index + 1}`;
			const fields = ['reason', 'needed', 'perspectives'];
			if (!collect.check(exactKeys(limitation, fields), `${where} has invalid fields.`)) return;

			collect.check(isNonEmptyString(limitation.reason), `${where} has no reason.`);
			collect.check(isNonEmptyString(limitation.needed), `${where} does not say what is needed.`);

			const affected = limitation.perspectives;
			const valid =
				Array.isArray(affected) &&
				affected.length > 0 &&
				affected.every(key => perspectiveKeys.includes(key));
			if (!collect.check(valid, `${where} names invalid perspectives.`)) return;

			for (const key of affected) {
				limited.add(key);
				collect.check(
					result.perspectives?.[key]?.coverage === 'incomplete',
					`${where} affects ${key}, which is not reported as incomplete.`,
				);
			}
		});
	}

	if (!collect.check(Array.isArray(result.questions), 'Questions must be an array.')) return;

	result.questions.forEach((question, index) => {
		const where = `Question ${index + 1}`;
		const fields = ['question', 'perspective', 'prevents_completion'];
		if (!collect.check(exactKeys(question, fields), `${where} has invalid fields.`)) return;

		collect.check(isNonEmptyString(question.question), `${where} is empty.`);
		collect.check(
			perspectiveKeys.includes(question.perspective),
			`${where} names an invalid perspective.`,
		);
		if (
			!collect.check(
				typeof question.prevents_completion === 'boolean',
				`${where} has an invalid completion flag.`,
			)
		) {
			return;
		}
		collect.check(
			!question.prevents_completion || limited.has(question.perspective),
			`${where} prevents completion without a matching limitation.`,
		);
	});
}

/**
 * Validates shape and semantics, and confirms that the reported outcome is the one the
 * contract derives. Anything this rejects is an incomplete execution, never a clean review.
 *
 * @param {unknown} value the parsed result returned by the reviewer.
 * @param {{ repository: string, base: string, head: string }} expected the reviewed change.
 * @returns {{ valid: boolean, errors: string[], outcome: string, result: unknown }}
 */
export function validateResult(value, expected) {
	const collect = createCollector();

	if (
		!collect.check(exactKeys(value, resultKeys), 'The result has missing or unexpected fields.')
	) {
		return { valid: false, errors: collect.errors, outcome: 'incomplete', result: null };
	}

	collect.check(value.version === 1, 'The result version must be 1.');
	collect.check(outcomes.includes(value.outcome), 'The reported outcome is invalid.');

	if (collect.check(isObject(value.scope), 'The result has no scope.')) {
		checkScope(collect, value, expected);
	}

	const findingIds = new Set();
	if (collect.check(Array.isArray(value.findings), 'Findings must be an array.')) {
		value.findings.forEach((finding, index) => checkFinding(collect, finding, index, findingIds));
	}

	if (collect.check(isObject(value.perspectives), 'The result has no perspectives.')) {
		checkPerspectives(collect, value, findingIds);
	}

	checkVerification(collect, value, findingIds);
	checkQuestionsAndLimitations(collect, value);

	if (collect.check(Array.isArray(value.context), 'Context must be an array.')) {
		value.context.forEach((item, index) => checkEvidence(collect, item, `Context ${index + 1}`));
	}
	collect.check(
		Array.isArray(value.follow_up) && value.follow_up.every(isNonEmptyString),
		'Follow-up work must be an array of non-empty strings.',
	);

	if (collect.errors.length === 0) {
		collect.check(
			value.outcome === deriveOutcome(value),
			'The reported outcome contradicts the findings, coverage, and limitations it reports.',
		);
	}

	const valid = collect.errors.length === 0;
	return {
		valid,
		errors: collect.errors,
		outcome: valid ? value.outcome : 'incomplete',
		result: valid ? value : null,
	};
}
