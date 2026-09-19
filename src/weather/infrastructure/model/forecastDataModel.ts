import { Expose } from 'class-transformer';
import { ForecastModel } from '@/weather/domain/model/forecastModel';
import type { DataModel } from '@/common/infrastructure/dataModel';

export class ForecastDataModel implements DataModel<ForecastModel> {
	@Expose() time!: string;
	@Expose() temperature_2m!: number;
	@Expose() relative_humidity_2m!: number;
	@Expose() weather_code!: number;
	@Expose() wind_speed_10m!: number;

	toDomain(): ForecastModel {
		return new ForecastModel({
			time: this.time,
			temperature2m: this.temperature_2m,
			relativehumidity2m: this.relative_humidity_2m,
			weatherCode: this.weather_code,
			windSpeed10m: this.wind_speed_10m,
		});
	}
}
