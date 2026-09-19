import type { ConstructorType } from '@/common/domain/constructorType';

export class ForecastModel {
	time: string;
	temperature2m: number;
	relativehumidity2m: number;
	weatherCode: number;
	windSpeed10m: number;

	constructor(forecast: ConstructorType<ForecastModel>) {
		this.time = forecast.time;
		this.temperature2m = forecast.temperature2m;
		this.relativehumidity2m = forecast.relativehumidity2m;
		this.weatherCode = forecast.weatherCode;
		this.windSpeed10m = forecast.windSpeed10m;
	}
}
