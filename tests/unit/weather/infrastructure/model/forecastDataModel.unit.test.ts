import { describe, expect, it } from 'vitest';
import { toDomain } from '../../../../../src/weather/infrastructure/model/forecastDataModel.js';
import { ForecastModel } from '../../../../../src/weather/domain/model/forecastModel.js';

describe('forecastDataModel toDomain', () => {
	it('maps an Open-Meteo current-conditions response into the domain model', () => {
		const domain = toDomain({
			time: '2026-09-19T00:00',
			temperature_2m: 18.4,
			relative_humidity_2m: 62,
			weather_code: 3,
			wind_speed_10m: 11.2,
		});

		expect(domain).toBeInstanceOf(ForecastModel);
		expect(domain).toEqual(
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
