export class PokemonDto {
	name: string;
	url: string;

	constructor({ name, url }: { name: string; url: string }) {
		this.name = name;
		this.url = url;
	}
}
