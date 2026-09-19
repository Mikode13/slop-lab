import { describe, expect, it, vi } from 'vitest';
import { GeocodingModel } from '../../../../src/weather/domain/model/geocodingModel.js';
import { ForecastModel } from '../../../../src/weather/domain/model/forecastModel.js';

const getCoordinates = vi.fn();
const getForecast = vi.fn();

vi.mock('../../../../src/weather/infrastructure/repository/forecastApiRepository.js', () => ({
	ForecastApiRepository: class {
		getCoordinates = getCoordinates;
		getForecast = getForecast;
	},
}));

const { default: getForecastUseCase } =
	await import('../../../../src/weather/application/getForecastUseCase.js');

describe('getForecastUseCase', () => {
	it('resolves the city to coordinates and combines them with the forecast', async () => {
		getCoordinates.mockResolvedValue(
			new GeocodingModel({
				id: 3117735,
				name: 'Madrid',
				country: 'Spain',
				latitude: 40.4165,
				longitude: -3.70256,
			}),
		);
		getForecast.mockResolvedValue(
			new ForecastModel({
				time: '2026-09-19T00:00',
				temperature2m: 18.4,
				relativehumidity2m: 62,
				weatherCode: 3,
				windSpeed10m: 11.2,
			}),
		);

		const weather = await getForecastUseCase('Madrid');

		expect(getCoordinates).toHaveBeenCalledWith('Madrid');
		expect(getForecast).toHaveBeenCalledWith({ latitude: 40.4165, longitude: -3.70256 });
		expect(weather.location).toBe('Madrid');
		expect(weather.country).toBe('Spain');
		expect(weather.temperature2m).toBe(18.4);
		expect(weather.weatherCode).toBe(3);
	});
});
