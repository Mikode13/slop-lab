import type { PokemonDetailModel } from '@/pokemon/domain/model/pokemonDetailModel';
import type { Paginated } from '@/pokemon/domain/model/paginated';
import type { PokemonModel } from '@/pokemon/domain/model/pokemonModel';

export interface PokemonRepository {
	getAll(offset: number, limit: number): Promise<Paginated<PokemonModel>>;
	getDetail(url: string): Promise<PokemonDetailModel>;
}
