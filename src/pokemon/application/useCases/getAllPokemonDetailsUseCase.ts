import type { PokemonDetailModel } from '../../domain/detailModel.js';
import type { Paginated } from '../../domain/paginated.js';
import type { PokemonRepository } from '../pokemonRepository.js';
import { PokemonRepositoryImpl } from '../../infrastructure/pokemonRepositoryImpl.js';

export async function getAllPokemonDetailsUseCase(
	offset: number,
	limit = 20,
): Promise<Paginated<PokemonDetailModel>> {
	const repository: PokemonRepository = new PokemonRepositoryImpl();
	const response = await repository.getAll(offset, limit);
	const pokemons = await Promise.all(
		response.results.map(async pokemon => repository.getDetail(pokemon.url)),
	);
	return {
		...response,
		results: pokemons,
	};
}
