import type { PokemonDetailModel } from '../models/detailModel.js';
import type { Paginated } from '../models/paginated.js';
import type { PokemonDto } from '../models/pokemonDtoModel.js';

export interface PokemonRepository {
	getAll(offset: number, limit: number): Promise<Paginated<PokemonDto>>;
	getDetail(url: string): Promise<PokemonDetailModel>;
}
