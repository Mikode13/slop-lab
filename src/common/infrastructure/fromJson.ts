import { plainToInstance, type ClassConstructor } from 'class-transformer';
import type { DataModel } from '@/common/domain/dataModel';

// A record type, not `object`: an array would make plainToInstance return a list, not one model.
export function fromJson<T extends DataModel<unknown>>(
	type: ClassConstructor<T>,
	json: Record<string, unknown>,
): T {
	return plainToInstance(type, json, { excludeExtraneousValues: true });
}
