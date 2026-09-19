import { LocatedForecastModel } from '@/weather/domain/model/locatedForecastModel';
import type { ForecastRepository } from '@/weather/domain/repository/forecastRepository';

export function createGetForecastUseCase(repository: ForecastRepository) {
	return async function getForecastUseCase(city: string): Promise<LocatedForecastModel> {
		const coordinates = await repository.getCoordinates(city);

		const { longitude, latitude } = coordinates;
		const forecast = await repository.getForecast({ longitude, latitude });

		return new LocatedForecastModel(forecast, {
			location: coordinates.name,
			country: coordinates.country,
			latitude,
			longitude,
		});
	};
}
