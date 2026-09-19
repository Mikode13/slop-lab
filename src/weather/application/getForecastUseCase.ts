import { LocatedForecastModel } from '../domain/model/locatedForecastModel.js';
import type { ForecastRepository } from '../domain/repository/forecastRepository.js';
import { ForecastApiRepository } from '../infrastructure/repository/forecastApiRepository.js';

export default async function getForecastUseCase(city: string) {
	const repository: ForecastRepository = new ForecastApiRepository();

	const coordinates = await repository.getCoordinates(city);

	const { longitude, latitude } = coordinates;
	const forecast = await repository.getForecast({ longitude, latitude });

	return new LocatedForecastModel(forecast, {
		location: coordinates.name,
		country: coordinates.country,
		latitude,
		longitude,
	});
}
