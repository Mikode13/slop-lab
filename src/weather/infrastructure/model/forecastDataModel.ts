import { ForecastModel } from '../../domain/model/forecastModel.js';

interface IForecastDataModel {
	time: string;
	temperature_2m: number;
	relative_humidity_2m: number;
	weather_code: number;
	wind_speed_10m: number;
}

export class ForecastDataModel {
	time: string;
	temperature_2m: number;
	relative_humidity_2m: number;
	weather_code: number;
	wind_speed_10m: number;

	constructor({
		time,
		temperature_2m,
		relative_humidity_2m,
		weather_code,
		wind_speed_10m,
	}: IForecastDataModel) {
		this.time = time;
		this.temperature_2m = temperature_2m;
		this.relative_humidity_2m = relative_humidity_2m;
		this.weather_code = weather_code;
		this.wind_speed_10m = wind_speed_10m;
	}
}

export function toDomain({
	time,
	temperature_2m,
	relative_humidity_2m,
	weather_code,
	wind_speed_10m,
}: IForecastDataModel): ForecastModel {
	return new ForecastModel({
		time,
		temperature2m: temperature_2m,
		relativehumidity2m: relative_humidity_2m,
		weatherCode: weather_code,
		windSpeed10m: wind_speed_10m,
	});
}
