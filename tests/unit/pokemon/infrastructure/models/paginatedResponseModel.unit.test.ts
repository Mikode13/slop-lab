import { describe, expect, it } from 'vitest';
import { pokemonListItemToDomain } from '../../../../../src/pokemon/infrastructure/models/paginatedResponseModel.js';
import { PokemonDto } from '../../../../../src/pokemon/domain/models/pokemonDtoModel.js';

describe('pokemonListItemToDomain', () => {
	it('maps a PokéAPI list item into the domain DTO', () => {
		const domain = pokemonListItemToDomain({
			name: 'bulbasaur',
			url: 'https://pokeapi.co/api/v2/pokemon/1/',
		});

		expect(domain).toBeInstanceOf(PokemonDto);
		expect(domain).toEqual(
			new PokemonDto({ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }),
		);
	});
});
