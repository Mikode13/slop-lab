import type { ConstructorType } from '@/common/domain/constructorType';

export class PokemonModel {
	name: string;
	url: string;

	constructor(pokemon: ConstructorType<PokemonModel>) {
		this.name = pokemon.name;
		this.url = pokemon.url;
	}
}
