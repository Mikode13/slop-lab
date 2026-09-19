import { describe, expect, it, vi } from 'vitest';
import { createGetAllPokemonDetailsUseCase } from '@/pokemon/application/getAllPokemonDetailsUseCase';
import { PokemonDetailModel } from '@/pokemon/domain/model/pokemonDetailModel';
import { PokemonModel } from '@/pokemon/domain/model/pokemonModel';
import type { PokemonRepository } from '@/pokemon/domain/repository/pokemonRepository';

describe('getAllPokemonDetailsUseCase', () => {
	it('fetches the page and resolves every listed Pokémon to its detail', async () => {
		const getAll = vi.fn().mockResolvedValue({
			count: 2,
			next: null,
			previous: null,
			results: [
				new PokemonModel({ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }),
				new PokemonModel({ name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' }),
			],
		});
		const getDetail = vi.fn(async (url: string) =>
			Promise.resolve(
				new PokemonDetailModel({
					id: url.endsWith('1/') ? 1 : 2,
					name: url.endsWith('1/') ? 'bulbasaur' : 'ivysaur',
					height: 7,
					weight: 69,
					sprite: 'https://example.test/sprite.png',
					types: [{ slot: 1, typeName: 'grass' }],
				}),
			),
		);
		const repository: PokemonRepository = { getAll, getDetail };

		const page = await createGetAllPokemonDetailsUseCase(repository)(0, 20);

		expect(getAll).toHaveBeenCalledWith(0, 20);
		expect(getDetail).toHaveBeenCalledTimes(2);
		expect(page.count).toBe(2);
		expect(page.results.map(pokemon => pokemon.name)).toEqual(['bulbasaur', 'ivysaur']);
	});
});
