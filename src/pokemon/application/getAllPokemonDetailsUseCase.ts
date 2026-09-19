import type { PokemonDetailModel } from '@/pokemon/domain/model/pokemonDetailModel';
import type { Paginated } from '@/pokemon/domain/model/paginated';
import type { PokemonRepository } from '@/pokemon/domain/repository/pokemonRepository';

export function createGetAllPokemonDetailsUseCase(repository: PokemonRepository) {
	return async function getAllPokemonDetailsUseCase(
		offset: number,
		limit = 20,
	): Promise<Paginated<PokemonDetailModel>> {
		const response = await repository.getAll(offset, limit);
		const pokemons = await Promise.all(
			response.results.map(async pokemon => repository.getDetail(pokemon.url)),
		);

		return {
			...response,
			results: pokemons,
		};
	};
}
