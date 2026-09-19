import type { ForecastModel } from '@/weather/domain/model/forecastModel';
import type { GeocodingModel } from '@/weather/domain/model/geocodingModel';
import type { Point } from '@/weather/domain/model/point';

export interface ForecastRepository {
	getCoordinates(city: string): Promise<GeocodingModel>;
	getForecast(point: Point): Promise<ForecastModel>;
}
