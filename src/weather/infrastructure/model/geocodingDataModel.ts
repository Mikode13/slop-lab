import { GeocodingModel } from '@/weather/domain/model/geocodingModel';

interface IGeocodingDataModel {
	id: number;
	name: string;
	country: string;
	latitude: number;
	longitude: number;
}

export class GeocodingDataModel {
	id: number;
	name: string;
	country: string;
	latitude: number;
	longitude: number;

	constructor({ id, name, country, latitude, longitude }: IGeocodingDataModel) {
		this.id = id;
		this.name = name;
		this.country = country;
		this.latitude = latitude;
		this.longitude = longitude;
	}
}

export function toDomain({
	id,
	name,
	country,
	latitude,
	longitude,
}: IGeocodingDataModel): GeocodingModel {
	return new GeocodingModel({ id, name, country, latitude, longitude });
}
