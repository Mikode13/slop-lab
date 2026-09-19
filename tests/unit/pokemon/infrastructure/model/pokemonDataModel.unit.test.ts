import { describe, expect, it } from 'vitest';
import { pokemonListItemToDomain } from '@/pokemon/infrastructure/model/pokemonDataModel';
import { PokemonModel } from '@/pokemon/domain/model/pokemonModel';

describe('pokemonListItemToDomain', () => {
	it('maps a PokéAPI list item into the domain model', () => {
		const domain = pokemonListItemToDomain({
			name: 'bulbasaur',
			url: 'https://pokeapi.co/api/v2/pokemon/1/',
		});

		expect(domain).toBeInstanceOf(PokemonModel);
		expect(domain).toEqual(
			new PokemonModel({ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }),
		);
	});
});
