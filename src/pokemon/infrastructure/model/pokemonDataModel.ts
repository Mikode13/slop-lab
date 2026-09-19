import { Expose } from 'class-transformer';
import { PokemonModel } from '@/pokemon/domain/model/pokemonModel';
import type { DataModel } from '@/common/infrastructure/dataModel';

export class PokemonDataModel implements DataModel<PokemonModel> {
	@Expose() name!: string;
	@Expose() url!: string;

	toDomain(): PokemonModel {
		return new PokemonModel({ name: this.name, url: this.url });
	}
}
