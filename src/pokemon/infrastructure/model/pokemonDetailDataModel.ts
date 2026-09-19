import { Expose, Type } from 'class-transformer';
import { PokemonDetailModel } from '@/pokemon/domain/model/pokemonDetailModel';
import type { DataModel } from '@/common/domain/dataModel';

class PokemonSpritesDataModel {
	@Expose() front_default!: string;
}

class PokemonTypeNameDataModel {
	@Expose() name!: string;
}

class PokemonTypeSlotDataModel {
	@Expose() slot!: number;

	@Expose()
	@Type(() => PokemonTypeNameDataModel)
	type!: PokemonTypeNameDataModel;
}

export class PokemonDetailDataModel implements DataModel<PokemonDetailModel> {
	@Expose() id!: number;
	@Expose() name!: string;
	@Expose() height!: number;
	@Expose() weight!: number;

	@Expose()
	@Type(() => PokemonSpritesDataModel)
	sprites!: PokemonSpritesDataModel;

	@Expose()
	@Type(() => PokemonTypeSlotDataModel)
	types!: PokemonTypeSlotDataModel[];

	toDomain(): PokemonDetailModel {
		return new PokemonDetailModel({
			id: this.id,
			name: this.name,
			height: this.height,
			weight: this.weight,
			sprite: this.sprites.front_default,
			types: this.types.map(type => ({ slot: type.slot, typeName: type.type.name })),
		});
	}
}
