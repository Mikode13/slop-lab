interface IForecastModel {
	time: string;
	temperature2m: number;
	relativehumidity2m: number;
	weatherCode: number;
	windSpeed10m: number;
}

export class ForecastModel {
	time: string;
	temperature2m: number;
	relativehumidity2m: number;
	weatherCode: number;
	windSpeed10m: number;

	constructor({
		time,
		temperature2m,
		relativehumidity2m,
		weatherCode,
		windSpeed10m,
	}: IForecastModel) {
		this.time = time;
		this.temperature2m = temperature2m;
		this.relativehumidity2m = relativehumidity2m;
		this.weatherCode = weatherCode;
		this.windSpeed10m = windSpeed10m;
	}
}
