import { Expose } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import type { DataModel } from '@/common/domain/dataModel';
import { fromJson } from '@/common/infrastructure/fromJson';

class SampleDataModel implements DataModel<string> {
	@Expose() name!: string;

	toDomain(): string {
		return this.name;
	}
}

describe('fromJson', () => {
	it('builds a real instance, so its methods exist', () => {
		const data = fromJson(SampleDataModel, { name: 'a' });

		expect(data).toBeInstanceOf(SampleDataModel);
		expect(data.toDomain()).toBe('a');
	});

	it('drops fields the model does not declare', () => {
		const data = fromJson(SampleDataModel, { name: 'a', extra: 1 });

		expect(data).not.toHaveProperty('extra');
	});

	it('does not accept an array, which would come back as a list of instances', () => {
		// @ts-expect-error an array is not a single JSON object
		expect(Array.isArray(fromJson(SampleDataModel, [{ name: 'a' }]))).toBe(true);
	});
});
