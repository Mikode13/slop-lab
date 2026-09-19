import axios from 'axios';
import type { PokemonDetailModel } from '@/pokemon/domain/model/pokemonDetailModel';
import type { PokemonRepository } from '@/pokemon/domain/repository/pokemonRepository';
import type { Paginated } from '@/pokemon/domain/model/paginated';
import type { PokemonModel } from '@/pokemon/domain/model/pokemonModel';
import { fromJson } from '@/common/infrastructure/fromJson';
import { PokemonDataModel } from '@/pokemon/infrastructure/model/pokemonDataModel';
import { PokemonDetailDataModel } from '@/pokemon/infrastructure/model/pokemonDetailDataModel';

const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon';

export class PokemonApiRepository implements PokemonRepository {
	async getAll(offset: number, limit: number): Promise<Paginated<PokemonModel>> {
		const response = await axios.get<Paginated<object>>(
			`${POKEAPI_URL}?limit=${String(limit)}&offset=${String(offset)}`,
		);

		return {
			count: response.data.count,
			next: response.data.next,
			previous: response.data.previous,
			results: response.data.results.map(item => fromJson(PokemonDataModel, item).toDomain()),
		};
	}

	async getDetail(url: string): Promise<PokemonDetailModel> {
		const response = await axios.get<object>(url);
		return fromJson(PokemonDetailDataModel, response.data).toDomain();
	}
}
