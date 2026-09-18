import { describe, expect, it } from 'vitest';
import { LocatedForecastModel } from '../../../../../src/weather/domain/model/locatedForecastModel.js';
import { ForecastModel } from '../../../../../src/weather/domain/model/forecastModel.js';

describe('LocatedForecastModel', () => {
	it('extends a forecast with the place it was resolved for', () => {
		const forecast = new ForecastModel({
			time: '2026-09-19T00:00',
			temperature2m: 18.4,
			relativehumidity2m: 62,
			weatherCode: 3,
			windSpeed10m: 11.2,
		});

		const located = new LocatedForecastModel(forecast, {
			location: 'Madrid',
			country: 'Spain',
			latitude: 40.4165,
			longitude: -3.70256,
		});

		expect(located).toBeInstanceOf(ForecastModel);
		expect(located.time).toBe(forecast.time);
		expect(located.temperature2m).toBe(forecast.temperature2m);
		expect(located.location).toBe('Madrid');
		expect(located.country).toBe('Spain');
		expect(located.latitude).toBe(40.4165);
		expect(located.longitude).toBe(-3.70256);
	});
});
