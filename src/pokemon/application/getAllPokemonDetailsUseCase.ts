import type { PokemonDetailModel } from '../domain/model/pokemonDetailModel.js';
import type { Paginated } from '../domain/model/paginated.js';
import type { PokemonRepository } from '../domain/repository/pokemonRepository.js';
import { PokemonApiRepository } from '../infrastructure/repository/pokemonApiRepository.js';

export async function getAllPokemonDetailsUseCase(
	offset: number,
	limit = 20,
): Promise<Paginated<PokemonDetailModel>> {
	const repository: PokemonRepository = new PokemonApiRepository();
	const response = await repository.getAll(offset, limit);
	const pokemons = await Promise.all(
		response.results.map(async pokemon => repository.getDetail(pokemon.url)),
	);
	return {
		...response,
		results: pokemons,
	};
}
