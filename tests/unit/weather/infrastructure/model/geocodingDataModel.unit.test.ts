import { describe, expect, it } from 'vitest';
import { toDomain } from '../../../../../src/weather/infrastructure/model/geocodingDataModel.js';
import { GeocodingModel } from '../../../../../src/weather/domain/model/geocodingModel.js';

describe('geocodingDataModel toDomain', () => {
	it('maps an Open-Meteo geocoding result into the domain model', () => {
		const domain = toDomain({
			id: 3117735,
			name: 'Madrid',
			country: 'Spain',
			latitude: 40.4165,
			longitude: -3.70256,
		});

		expect(domain).toBeInstanceOf(GeocodingModel);
		expect(domain).toEqual(
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
