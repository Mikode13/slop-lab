import { defineConfig } from 'vitest/config';

// Component and end-to-end boundaries join this file as the layered migration reaches the UI
// and infrastructure; see docs/testing.md for the boundaries this project currently exposes.
export default defineConfig({
	test: {
		// Domain and application code do not exist yet on this branch. Drop this once the first
		// unit test lands, so an empty suite stops passing silently.
		passWithNoTests: true,
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
