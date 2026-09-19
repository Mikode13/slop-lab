import { defineConfig } from 'vitest/config';

// Component and end-to-end boundaries join this file as they're adopted; see README.md's
// "current status" for which of the testing standard's boundaries exist today.
export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'unit',
					include: ['tests/unit/**/*.unit.test.{ts,tsx}'],
					environment: 'node',
				},
			},
		],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.{ts,tsx}'],
		},
	},
});
