import { createGetAllPokemonDetailsUseCase } from '@/pokemon/application/getAllPokemonDetailsUseCase';
import { PokemonApiRepository } from '@/pokemon/infrastructure/repository/pokemonApiRepository';
import { createGetForecastUseCase } from '@/weather/application/getForecastUseCase';
import { ForecastApiRepository } from '@/weather/infrastructure/repository/forecastApiRepository';

export function createApplication() {
	const pokemonRepository = new PokemonApiRepository();
	const forecastRepository = new ForecastApiRepository();

	return {
		getAllPokemonDetails: createGetAllPokemonDetailsUseCase(pokemonRepository),
		getForecast: createGetForecastUseCase(forecastRepository),
	};
}

export type Application = ReturnType<typeof createApplication>;
