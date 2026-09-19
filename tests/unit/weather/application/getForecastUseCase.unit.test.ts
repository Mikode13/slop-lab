import { describe, expect, it, vi } from 'vitest';
import { createGetForecastUseCase } from '@/weather/application/getForecastUseCase';
import { ForecastModel } from '@/weather/domain/model/forecastModel';
import { GeocodingModel } from '@/weather/domain/model/geocodingModel';
import type { ForecastRepository } from '@/weather/domain/repository/forecastRepository';

describe('getForecastUseCase', () => {
	it('resolves the city to coordinates and combines them with the forecast', async () => {
		const getCoordinates = vi.fn().mockResolvedValue(
			new GeocodingModel({
				id: 3117735,
				name: 'Madrid',
				country: 'Spain',
				latitude: 40.4165,
				longitude: -3.70256,
			}),
		);
		const getForecast = vi.fn().mockResolvedValue(
			new ForecastModel({
				time: '2026-09-19T00:00',
				temperature2m: 18.4,
				relativehumidity2m: 62,
				weatherCode: 3,
				windSpeed10m: 11.2,
			}),
		);
		const repository: ForecastRepository = { getCoordinates, getForecast };

		const weather = await createGetForecastUseCase(repository)('Madrid');

		expect(getCoordinates).toHaveBeenCalledWith('Madrid');
		expect(getForecast).toHaveBeenCalledWith({ latitude: 40.4165, longitude: -3.70256 });
		expect(weather.location).toBe('Madrid');
		expect(weather.country).toBe('Spain');
		expect(weather.temperature2m).toBe(18.4);
		expect(weather.weatherCode).toBe(3);
	});

	it('does not request a forecast when the city cannot be resolved', async () => {
		const getForecast = vi.fn();
		const repository: ForecastRepository = {
			getCoordinates: vi.fn().mockRejectedValue(new Error('City data not found')),
			getForecast,
		};

		await expect(createGetForecastUseCase(repository)('Nowhere')).rejects.toThrow(
			'City data not found',
		);
		expect(getForecast).not.toHaveBeenCalled();
	});
});
