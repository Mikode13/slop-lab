import { plainToInstance, type ClassConstructor } from 'class-transformer';
import type { DataModel } from '@/common/domain/dataModel';

export function fromJson<T extends DataModel<unknown>>(type: ClassConstructor<T>, json: object): T {
	return plainToInstance(type, json, { excludeExtraneousValues: true });
}
