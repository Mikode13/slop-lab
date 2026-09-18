import { defineConfig } from 'vitest/config';

// Component and end-to-end boundaries join this file as the layered migration reaches the UI
// and infrastructure; see docs/testing.md for the boundaries this project currently exposes.
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
