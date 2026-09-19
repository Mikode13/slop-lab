interface IGeocodingModel {
	id: number;
	name: string;
	country: string;
	latitude: number;
	longitude: number;
}

export class GeocodingModel {
	id: number;
	name: string;
	country: string;
	latitude: number;
	longitude: number;

	constructor({ id, name, country, latitude, longitude }: IGeocodingModel) {
		this.id = id;
		this.name = name;
		this.country = country;
		this.latitude = latitude;
		this.longitude = longitude;
	}
}
