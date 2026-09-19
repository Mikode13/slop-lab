import axios from 'axios';
import type { PokemonDetailModel } from '../../domain/model/pokemonDetailModel.js';
import type { PokemonRepository } from '../../domain/repository/pokemonRepository.js';
import type { Paginated } from '../../domain/model/paginated.js';
import type { PokemonModel } from '../../domain/model/pokemonModel.js';
import {
	pokemonDetailToDomain,
	type PokemonDetailDataModel,
} from '../model/pokemonDetailDataModel.js';
import { pokemonListItemToDomain, type PokemonDataModel } from '../model/pokemonDataModel.js';

const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon';

export class PokemonApiRepository implements PokemonRepository {
	async getAll(offset: number, limit: number): Promise<Paginated<PokemonModel>> {
		const response = await axios.get<Paginated<PokemonDataModel>>(
			`${POKEAPI_URL}?limit=${String(limit)}&offset=${String(offset)}`,
		);

		return {
			count: response.data.count,
			next: response.data.next,
			previous: response.data.previous,
			results: response.data.results.map(pokemonListItemToDomain),
		};
	}

	async getDetail(url: string): Promise<PokemonDetailModel> {
		const response = await axios.get<PokemonDetailDataModel>(url);
		return pokemonDetailToDomain(response.data);
	}
}
