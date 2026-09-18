export class PokemonDetailModel {
	id: number;
	name: string;
	height: number;
	weight: number;
	sprite: string;
	types: PokemonType[];

	constructor({
		id,
		name,
		height,
		weight,
		sprite,
		types,
	}: {
		id: number;
		name: string;
		height: number;
		weight: number;
		sprite: string;
		types: PokemonType[];
	}) {
		this.id = id;
		this.name = name;
		this.height = height;
		this.weight = weight;
		this.sprite = sprite;
		this.types = types;
	}
}

export interface PokemonType {
	slot: number;
	typeName: string;
}
