import axios from 'axios';
import type { ForecastModel } from '@/weather/domain/model/forecastModel';
import type { GeocodingModel } from '@/weather/domain/model/geocodingModel';
import type { Point } from '@/weather/domain/model/point';
import type { ForecastRepository } from '@/weather/domain/repository/forecastRepository';
import { fromJson } from '@/common/infrastructure/dataModel';
import { ForecastDataModel } from '@/weather/infrastructure/model/forecastDataModel';
import { GeocodingDataModel } from '@/weather/infrastructure/model/geocodingDataModel';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export class ForecastApiRepository implements ForecastRepository {
	async getCoordinates(city: string): Promise<GeocodingModel> {
		const response = await axios.get<{ results?: object[] } | null>(
			`${GEOCODING_URL}?name=${city}&count=1&language=en&format=json`,
		);

		const places = response.data?.results;

		if (!places?.length || !places[0]) {
			throw new Error('City data not found');
		}

		return fromJson(GeocodingDataModel, places[0]).toDomain();
	}
	async getForecast({ latitude, longitude }: Point): Promise<ForecastModel> {
		const response = await axios.get<{ current: object }>(
			`${FORECAST_URL}?latitude=${String(latitude)}&longitude=${String(longitude)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`,
		);

		return fromJson(ForecastDataModel, response.data.current).toDomain();
	}
}
