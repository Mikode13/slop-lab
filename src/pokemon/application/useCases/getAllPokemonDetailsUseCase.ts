import type { PokemonDetailModel } from '../../domain/models/detailModel.js';
import type { Paginated } from '../../domain/models/paginated.js';
import type { PokemonRepository } from '../../domain/interfaces/pokemonRepository.js';
import { PokemonRepositoryImpl } from '../../infrastructure/repository/pokemonRepositoryImpl.js';

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
