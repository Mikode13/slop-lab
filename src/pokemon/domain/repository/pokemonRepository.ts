import type { PokemonDetailModel } from '../model/pokemonDetailModel.js';
import type { Paginated } from '../model/paginated.js';
import type { PokemonModel } from '../model/pokemonModel.js';

export interface PokemonRepository {
	getAll(offset: number, limit: number): Promise<Paginated<PokemonModel>>;
	getDetail(url: string): Promise<PokemonDetailModel>;
}
