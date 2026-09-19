import { describe, expect, it, vi } from 'vitest';
import { PokemonDetailModel } from '../../../../src/pokemon/domain/model/pokemonDetailModel.js';
import { PokemonModel } from '../../../../src/pokemon/domain/model/pokemonModel.js';

const getAll = vi.fn();
const getDetail = vi.fn();

vi.mock('../../../../src/pokemon/infrastructure/repository/pokemonApiRepository.js', () => ({
	PokemonApiRepository: class {
		getAll = getAll;
		getDetail = getDetail;
	},
}));

const { getAllPokemonDetailsUseCase } =
	await import('../../../../src/pokemon/application/getAllPokemonDetailsUseCase.js');

describe('getAllPokemonDetailsUseCase', () => {
	it('fetches the page and resolves every listed Pokémon to its detail', async () => {
		getAll.mockResolvedValue({
			count: 2,
			next: null,
			previous: null,
			results: [
				new PokemonModel({ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' }),
				new PokemonModel({ name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' }),
			],
		});
		getDetail.mockImplementation(async (url: string) =>
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

		const page = await getAllPokemonDetailsUseCase(0, 20);

		expect(getAll).toHaveBeenCalledWith(0, 20);
		expect(getDetail).toHaveBeenCalledTimes(2);
		expect(page.count).toBe(2);
		expect(page.results.map(pokemon => pokemon.name)).toEqual(['bulbasaur', 'ivysaur']);
	});
});
