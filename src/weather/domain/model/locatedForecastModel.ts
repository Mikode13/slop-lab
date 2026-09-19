import { ForecastModel } from '@/weather/domain/model/forecastModel';

export class LocatedForecastModel extends ForecastModel {
	location: string;
	country: string;
	latitude: number;
	longitude: number;

	constructor(
		forecast: ForecastModel,
		place: Pick<LocatedForecastModel, 'location' | 'country' | 'latitude' | 'longitude'>,
	) {
		super(forecast);
		this.location = place.location;
		this.country = place.country;
		this.latitude = place.latitude;
		this.longitude = place.longitude;
	}
}
