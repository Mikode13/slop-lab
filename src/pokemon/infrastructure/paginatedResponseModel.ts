import { PokemonDto } from '../domain/pokemonDtoModel.js';

export interface PokemonListItemResponseDto {
	name: string;
	url: string;
}

export function pokemonListItemToDomain(raw: PokemonListItemResponseDto): PokemonDto {
	return new PokemonDto({ name: raw.name, url: raw.url });
}
