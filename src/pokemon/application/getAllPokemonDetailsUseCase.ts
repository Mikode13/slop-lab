import type { PokemonDetailModel } from '@/pokemon/domain/model/pokemonDetailModel';
import type { Paginated } from '@/pokemon/domain/model/paginated';
import type { PokemonRepository } from '@/pokemon/domain/repository/pokemonRepository';
import { PokemonApiRepository } from '@/pokemon/infrastructure/repository/pokemonApiRepository';

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
