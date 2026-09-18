import { PokemonDetailModel } from '../../domain/model/detailModel.js';

export interface PokemonDetailResponseDto {
	id: number;
	name: string;
	height: number;
	weight: number;
	sprites: {
		front_default: string;
	};
	types: {
		slot: number;
		type: {
			name: string;
		};
	}[];
}

export function pokemonDetailToDomain(raw: PokemonDetailResponseDto): PokemonDetailModel {
	return new PokemonDetailModel({
		id: raw.id,
		name: raw.name,
		height: raw.height,
		weight: raw.weight,
		sprite: raw.sprites.front_default,
		types: raw.types.map(type => ({ slot: type.slot, typeName: type.type.name })),
	});
}
