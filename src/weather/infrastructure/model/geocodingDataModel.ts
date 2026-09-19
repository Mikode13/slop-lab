import { Expose } from 'class-transformer';
import { GeocodingModel } from '@/weather/domain/model/geocodingModel';
import type { DataModel } from '@/common/infrastructure/dataModel';

export class GeocodingDataModel implements DataModel<GeocodingModel> {
	@Expose() id!: number;
	@Expose() name!: string;
	@Expose() country!: string;
	@Expose() latitude!: number;
	@Expose() longitude!: number;

	toDomain(): GeocodingModel {
		return new GeocodingModel({
			id: this.id,
			name: this.name,
			country: this.country,
			latitude: this.latitude,
			longitude: this.longitude,
		});
	}
}
