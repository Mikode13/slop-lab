import { plainToInstance, type ClassConstructor } from 'class-transformer';

export interface DataModel<DomainModelType> {
	toDomain(): DomainModelType;
}

export function fromJson<T extends DataModel<unknown>>(type: ClassConstructor<T>, json: object): T {
	return plainToInstance(type, json, { excludeExtraneousValues: true });
}
