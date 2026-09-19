import { PokemonModel } from '../../domain/model/pokemonModel.js';

export interface PokemonListItemResponseDto {
	name: string;
	url: string;
}

export function pokemonListItemToDomain(raw: PokemonListItemResponseDto): PokemonModel {
	return new PokemonModel({ name: raw.name, url: raw.url });
}
