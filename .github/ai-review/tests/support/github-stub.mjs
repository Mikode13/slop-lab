/**
 * Stands in for the GitHub API while the publisher runs under test: it serves a prepared diff and
 * review list, answers the review thread queries as GitHub would after the posted review, and
 * records the review the publisher posts and the threads it resolves, so no test reaches GitHub
 * or needs a token. STUB_GRAPHQL_ERROR makes every GraphQL call fail with that message.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const diff = readFileSync(process.env.STUB_DIFF, 'utf8');
const reviews = JSON.parse(readFileSync(process.env.STUB_REVIEWS, 'utf8'));

let posted = null;
const resolved = [];

const reply = body => ({ ok: true, json: () => Promise.resolve(body) });

/**
 * One open thread per comment of the posted review, started by the Actions bot, served in pages
 * of STUB_THREAD_PAGE_SIZE. STUB_VISIBLE_THREADS hides every thread after that many.
 */
function threads(after) {
	const all = (posted?.comments ?? [])
		.map((comment, index) => ({
			id: `thread-${index}`,
			isResolved: false,
			comments: { nodes: [{ body: comment.body, author: { login: 'github-actions' } }] },
		}))
		.slice(0, Number(process.env.STUB_VISIBLE_THREADS ?? Infinity));
	const start = Number(after ?? 0);
	const nodes = all.slice(start, start + Number(process.env.STUB_THREAD_PAGE_SIZE ?? 100));
	const end = start + nodes.length;
	return { pageInfo: { hasNextPage: end < all.length, endCursor: String(end) }, nodes };
}

function answerGraphql(options) {
	if (process.env.STUB_GRAPHQL_ERROR) {
		return reply({ errors: [{ message: process.env.STUB_GRAPHQL_ERROR }] });
	}
	const { query, variables } = JSON.parse(options.body);
	if (query.includes('resolveReviewThread')) {
		resolved.push(variables.threadId);
		writeFileSync(process.env.STUB_RESOLVED, JSON.stringify(resolved));
		return reply({ data: { resolveReviewThread: { thread: { id: variables.threadId } } } });
	}
	return reply({
		data: { repository: { pullRequest: { reviewThreads: threads(variables.after) } } },
	});
}

globalThis.fetch = (url, options = {}) => {
	const method = options.method ?? 'GET';
	if (method === 'POST' && url.endsWith('/graphql')) return Promise.resolve(answerGraphql(options));
	if (method === 'POST' && url.endsWith('/reviews')) {
		posted = JSON.parse(options.body);
		writeFileSync(process.env.STUB_POSTED, options.body);
		return Promise.resolve(reply({ id: 1 }));
	}
	if (url.endsWith('/reviews?per_page=100')) return Promise.resolve(reply(reviews));
	if (options.headers?.accept?.endsWith('diff')) {
		return Promise.resolve({ ok: true, text: () => Promise.resolve(diff) });
	}
	return Promise.reject(new Error(`Unexpected request: ${method} ${url}`));
};
