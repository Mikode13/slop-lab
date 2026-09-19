import { ForecastModel } from './forecastModel';

export class LocatedForecastModel extends ForecastModel {
	location: string;
	country: string;
	latitude: number;
	longitude: number;

	constructor(
		forecast: ForecastModel,
		{
			location,
			country,
			latitude,
			longitude,
		}: { location: string; country: string; latitude: number; longitude: number },
	) {
		super(forecast);
		this.location = location;
		this.country = country;
		this.latitude = latitude;
		this.longitude = longitude;
	}
}
