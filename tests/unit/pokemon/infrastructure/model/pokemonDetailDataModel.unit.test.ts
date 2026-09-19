import { describe, expect, it } from 'vitest';
import { fromJson } from '@/common/infrastructure/dataModel';
import { PokemonDetailModel } from '@/pokemon/domain/model/pokemonDetailModel';
import { PokemonDetailDataModel } from '@/pokemon/infrastructure/model/pokemonDetailDataModel';

describe('PokemonDetailDataModel', () => {
	it('builds a real instance from a PokéAPI detail response and maps it to the domain', () => {
		const data = fromJson(PokemonDetailDataModel, {
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

		expect(data).toBeInstanceOf(PokemonDetailDataModel);
		expect(data.toDomain()).toEqual(
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
		const data = fromJson(PokemonDetailDataModel, {
			id: 4,
			name: 'charmander',
			height: 6,
			weight: 85,
			sprites: { front_default: 'https://example.test/charmander.png' },
			types: [{ slot: 1, type: { name: 'fire' } }],
		});

		expect(data.toDomain().types).toEqual([{ slot: 1, typeName: 'fire' }]);
	});
});
