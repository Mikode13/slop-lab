import { describe, expect, it } from 'vitest';
import { pokemonDetailToDomain } from '../../../../../src/pokemon/infrastructure/models/detailResponseModel.js';
import { PokemonDetailModel } from '../../../../../src/pokemon/domain/models/detailModel.js';

describe('pokemonDetailToDomain', () => {
	it('maps a PokéAPI detail response into the domain model', () => {
		const domain = pokemonDetailToDomain({
			id: 1,
			name: 'bulbasaur',
			height: 7,
			weight: 69,
			sprites: { front_default: 'https://example.test/bulbasaur.png' },
			types: [
				{ slot: 1, type: { name: 'grass' } },
				{ slot: 2, type: { name: 'poison' } },
			],
		});

		expect(domain).toBeInstanceOf(PokemonDetailModel);
		expect(domain).toEqual(
			new PokemonDetailModel({
				id: 1,
				name: 'bulbasaur',
				height: 7,
				weight: 69,
				sprite: 'https://example.test/bulbasaur.png',
				types: [
					{ slot: 1, typeName: 'grass' },
					{ slot: 2, typeName: 'poison' },
				],
			}),
		);
	});

	it('maps a single-type Pokémon without leaving the second slot behind', () => {
		const domain = pokemonDetailToDomain({
			id: 4,
			name: 'charmander',
			height: 6,
			weight: 85,
			sprites: { front_default: 'https://example.test/charmander.png' },
			types: [{ slot: 1, type: { name: 'fire' } }],
		});

		expect(domain.types).toEqual([{ slot: 1, typeName: 'fire' }]);
	});
});
