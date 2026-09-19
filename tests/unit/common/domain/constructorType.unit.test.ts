import { describe, expectTypeOf, it } from 'vitest';
import type { ConstructorType } from '@/common/domain/constructorType';

class Sample {
	id = 1;
	note?: string;
	callback: () => void = () => undefined;
	optionalCallback?: () => void;
	nullableCallback: (() => void) | null = null;
	arrow = () => 1;

	method(): number {
		return 3;
	}
}

describe('ConstructorType', () => {
	it('keeps data members, optional ones included', () => {
		expectTypeOf<ConstructorType<Sample>>().toEqualTypeOf<{ id: number; note?: string }>();
	});

	it('drops every function member, whether required, optional, or nullable', () => {
		expectTypeOf<keyof ConstructorType<Sample>>().toEqualTypeOf<'id' | 'note'>();
	});
});
