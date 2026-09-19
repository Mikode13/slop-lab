import { describe, expect, it } from 'vitest';
import { fromJson } from '@/common/infrastructure/fromJson';
import { GeocodingModel } from '@/weather/domain/model/geocodingModel';
import { GeocodingDataModel } from '@/weather/infrastructure/model/geocodingDataModel';

describe('GeocodingDataModel', () => {
	it('builds a real instance from an Open-Meteo geocoding result and maps it to the domain', () => {
		const data = fromJson(GeocodingDataModel, {
			id: 3117735,
			name: 'Madrid',
			country: 'Spain',
			latitude: 40.4165,
			longitude: -3.70256,
			timezone: 'Europe/Madrid',
		});

		expect(data).toBeInstanceOf(GeocodingDataModel);
		expect(data).not.toHaveProperty('timezone');
		expect(data.toDomain()).toEqual(
			new GeocodingModel({
				id: 3117735,
				name: 'Madrid',
				country: 'Spain',
				latitude: 40.4165,
				longitude: -3.70256,
			}),
		);
	});
});
