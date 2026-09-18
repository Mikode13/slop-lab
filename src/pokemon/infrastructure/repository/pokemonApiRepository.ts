import axios from 'axios';
import type { PokemonDetailModel } from '../../domain/model/detailModel.js';
import type { PokemonRepository } from '../../domain/repository/pokemonRepository.js';
import type { Paginated } from '../../domain/model/paginated.js';
import type { PokemonDto } from '../../domain/model/pokemonDtoModel.js';
import {
	pokemonDetailToDomain,
	type PokemonDetailResponseDto,
} from '../model/detailResponseModel.js';
import {
	pokemonListItemToDomain,
	type PokemonListItemResponseDto,
} from '../model/paginatedResponseModel.js';

const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon';

export class PokemonApiRepository implements PokemonRepository {
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
