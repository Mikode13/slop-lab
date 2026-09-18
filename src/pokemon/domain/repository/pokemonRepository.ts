import type { PokemonDetailModel } from '../model/detailModel.js';
import type { Paginated } from '../model/paginated.js';
import type { PokemonDto } from '../model/pokemonDtoModel.js';

export interface PokemonRepository {
	getAll(offset: number, limit: number): Promise<Paginated<PokemonDto>>;
	getDetail(url: string): Promise<PokemonDetailModel>;
}
