import { PokemonModel } from '@/pokemon/domain/model/pokemonModel';

export interface PokemonDataModel {
	name: string;
	url: string;
}

export function pokemonListItemToDomain(raw: PokemonDataModel): PokemonModel {
	return new PokemonModel({ name: raw.name, url: raw.url });
}
