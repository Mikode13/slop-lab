import type { ConstructorType } from '@/common/domain/constructorType';

export class GeocodingModel {
	id: number;
	name: string;
	country: string;
	latitude: number;
	longitude: number;

	constructor(place: ConstructorType<GeocodingModel>) {
		this.id = place.id;
		this.name = place.name;
		this.country = place.country;
		this.latitude = place.latitude;
		this.longitude = place.longitude;
	}
}
