import { describe, expect, it } from 'vitest';
import { fromJson } from '@/common/infrastructure/dataModel';
import { ForecastModel } from '@/weather/domain/model/forecastModel';
import { ForecastDataModel } from '@/weather/infrastructure/model/forecastDataModel';

describe('ForecastDataModel', () => {
	it('builds a real instance from an Open-Meteo current-conditions response and maps it to the domain', () => {
		const data = fromJson(ForecastDataModel, {
			time: '2026-09-19T00:00',
			temperature_2m: 18.4,
			relative_humidity_2m: 62,
			weather_code: 3,
			wind_speed_10m: 11.2,
			interval: 900,
		});

		expect(data).toBeInstanceOf(ForecastDataModel);
		expect(data.toDomain()).toEqual(
			new ForecastModel({
				time: '2026-09-19T00:00',
				temperature2m: 18.4,
				relativehumidity2m: 62,
				weatherCode: 3,
				windSpeed10m: 11.2,
			}),
		);
	});
});
