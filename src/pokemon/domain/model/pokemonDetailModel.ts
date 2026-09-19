import type { ConstructorType } from '@/common/domain/constructorType';

export class PokemonDetailModel {
	id: number;
	name: string;
	height: number;
	weight: number;
	sprite: string;
	types: PokemonType[];

	constructor(pokemon: ConstructorType<PokemonDetailModel>) {
		this.id = pokemon.id;
		this.name = pokemon.name;
		this.height = pokemon.height;
		this.weight = pokemon.weight;
		this.sprite = pokemon.sprite;
		this.types = pokemon.types;
	}
}

export interface PokemonType {
	slot: number;
	typeName: string;
}
