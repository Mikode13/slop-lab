import { describe, expect, it } from 'vitest';
import { fromJson } from '@/common/infrastructure/dataModel';
import { PokemonModel } from '@/pokemon/domain/model/pokemonModel';
import { PokemonDataModel } from '@/pokemon/infrastructure/model/pokemonDataModel';

describe('PokemonDataModel', () => {
	it('builds a real instance from a PokéAPI list item and maps it to the domain', () => {
		const data = fromJson(PokemonDataModel, {
			name: 'bulbasaur',
			url: 'https://pokeapi.co/api/v2/pokemon/1/',
		});

		expect(data).toBeInstanceOf(PokemonDataModel);
		expect(data.toDomain()).toEqual(
			new PokemonModel({ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }),
		);
	});

	it('drops fields the model does not declare', () => {
		const data = fromJson(PokemonDataModel, { name: 'bulbasaur', url: 'u', extra: 1 });

		expect(data).not.toHaveProperty('extra');
	});
});
