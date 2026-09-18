import type { PokemonDetailModel } from '../domain/detailModel.js';
import type { Paginated } from '../domain/paginated.js';
import type { PokemonDto } from '../domain/pokemonDtoModel.js';

export interface PokemonRepository {
	getAll(offset: number, limit: number): Promise<Paginated<PokemonDto>>;
	getDetail(url: string): Promise<PokemonDetailModel>;
}
