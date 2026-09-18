import axios from 'axios';
import type { ForecastModel } from '../../domain/model/forecastModel.js';
import type { GeocodingModel } from '../../domain/model/geocodingModel.js';
import type { Point } from '../../domain/model/pointModel.js';
import type { ForecastRepository } from '../../domain/repository/forecastRepository.js';
import {
	toDomain as forecastToDomain,
	type ForecastDataModel,
} from '../model/forecastDataModel.js';
import {
	toDomain as geocodeToDomain,
	type GeocodingDataModel,
} from '../model/geocodingDataModel.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export class ForecastApiRepository implements ForecastRepository {
	async getCoordinates(city: string): Promise<GeocodingModel> {
		const response = await axios.get<{ results: GeocodingDataModel[] } | null>(
			`${GEOCODING_URL}?name=${city}&count=1&language=en&format=json`,
		);

		const places = response.data?.results;

		if (!places?.length || !places[0]) {
			throw new Error('City data not found');
		}

		return geocodeToDomain(places[0]);
	}
	async getForecast({ latitude, longitude }: Point): Promise<ForecastModel> {
		const response = await axios.get<{ current: ForecastDataModel }>(
			`${FORECAST_URL}?latitude=${String(latitude)}&longitude=${String(longitude)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`,
		);

		return forecastToDomain(response.data.current);
	}
}
