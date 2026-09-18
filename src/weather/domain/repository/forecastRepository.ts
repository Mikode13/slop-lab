import type { ForecastModel } from '../model/forecastModel.js';
import type { GeocodingModel } from '../model/geocodingModel.js';
import type { Point } from '../model/pointModel.js';

export interface ForecastRepository {
	getCoordinates(city: string): Promise<GeocodingModel>;
	getForecast(point: Point): Promise<ForecastModel>;
}
