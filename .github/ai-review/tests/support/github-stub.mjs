/**
 * Stands in for the GitHub API while the publisher runs under test: it serves a prepared diff
 * and an empty review list, and records the review the publisher posts, so no test reaches
 * GitHub or needs a token.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const diff = readFileSync(process.env.STUB_DIFF, 'utf8');

const reply = body => ({ ok: true, json: () => Promise.resolve(body) });

globalThis.fetch = (url, options = {}) => {
	const method = options.method ?? 'GET';
	if (method === 'POST' && url.endsWith('/reviews')) {
		writeFileSync(process.env.STUB_POSTED, options.body);
		return Promise.resolve(reply({ id: 1 }));
	}
	if (url.endsWith('/reviews?per_page=100')) return Promise.resolve(reply([]));
	if (options.headers?.accept?.endsWith('diff')) {
		return Promise.resolve({ ok: true, text: () => Promise.resolve(diff) });
	}
	return Promise.reject(new Error(`Unexpected request: ${method} ${url}`));
};
