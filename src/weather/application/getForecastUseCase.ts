import { LocatedForecastModel } from '@/weather/domain/model/locatedForecastModel';
import type { ForecastRepository } from '@/weather/domain/repository/forecastRepository';
import { ForecastApiRepository } from '@/weather/infrastructure/repository/forecastApiRepository';

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
