import axios from 'axios';
import type { PokemonDetailModel } from '../domain/detailModel.js';
import type { PokemonRepository } from '../application/pokemonRepository.js';
import type { Paginated } from '../domain/paginated.js';
import type { PokemonDto } from '../domain/pokemonDtoModel.js';
import { pokemonDetailToDomain, type PokemonDetailResponseDto } from './detailResponseModel.js';
import {
	pokemonListItemToDomain,
	type PokemonListItemResponseDto,
} from './paginatedResponseModel.js';

const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon';

export class PokemonRepositoryImpl implements PokemonRepository {
	async getAll(offset: number, limit: number): Promise<Paginated<PokemonDto>> {
		const response = await axios.get<Paginated<PokemonListItemResponseDto>>(
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
		const response = await axios.get<PokemonDetailResponseDto>(url);
		return pokemonDetailToDomain(response.data);
	}
}
