import { useEffect, useState } from 'react';
import { PokemonApiRepository } from '@/pokemon/infrastructure/repository/pokemonApiRepository';
import type { PokemonDetailModel } from '@/pokemon/domain/model/pokemonDetailModel';

const PAGE_SIZE = 20;
const pokemonRepository = new PokemonApiRepository();

// Colors for every Pokémon type
const TYPE_COLORS: Record<string, string> = {
	normal: '#a8a878',
	fire: '#f08030',
	water: '#6890f0',
	electric: '#f8d030',
	grass: '#78c850',
	ice: '#98d8d8',
	fighting: '#c03028',
	poison: '#a040a0',
	ground: '#e0c068',
	flying: '#a890f0',
	psychic: '#f85888',
	bug: '#a8b820',
	rock: '#b8a038',
	ghost: '#705898',
	dragon: '#7038f8',
	dark: '#705848',
	steel: '#b8b8d0',
	fairy: '#ee99ac',
};

export default function PokemonBrowser() {
	const [pokemons, setPokemons] = useState<PokemonDetailModel[]>([]);
	const [offset, setOffset] = useState(0);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState('');

	// Load the current page and then every detail
	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const page = await pokemonRepository.getAll(offset, PAGE_SIZE);
				const details = await Promise.all(
					page.results.map(async pokemon => pokemonRepository.getDetail(pokemon.url)),
				);
				setTotal(page.count);
				setPokemons(details);
			} catch (error) {
				console.error('Something went wrong', error);
			}
			setLoading(false);
		};

		void load();
	}, [offset]);

	const visible = pokemons.filter(p => p.name.includes(filter.toLowerCase()));
	const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div
			style={{
				background: '#fff',
				borderRadius: '8px',
				padding: '24px',
				border: '1px solid #e0e0e0',
			}}
		>
			<label htmlFor="filter" style={{ display: 'block', marginBottom: '8px' }}>
				Filter
			</label>
			<input
				id="filter"
				value={filter}
				onChange={event => {
					setFilter(event.target.value);
				}}
				style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '260px' }}
			/>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '12px',
					margin: '24px 0',
				}}
			>
				<button
					type="button"
					disabled={offset === 0}
					onClick={() => {
						setOffset(offset - PAGE_SIZE);
					}}
					style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc' }}
				>
					Previous
				</button>
				<span style={{ color: '#666' }}>
					Page {currentPage} of {totalPages}
				</span>
				<button
					type="button"
					disabled={offset + PAGE_SIZE >= total}
					onClick={() => {
						setOffset(offset + PAGE_SIZE);
					}}
					style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc' }}
				>
					Next
				</button>
			</div>

			{loading && <p>Loading...</p>}

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
					gap: '16px',
				}}
			>
				{visible.map(p => (
					<div
						key={p.id}
						style={{
							border: '1px solid #e0e0e0',
							borderRadius: '8px',
							padding: '16px',
							textAlign: 'center',
						}}
					>
						<img src={p.sprite} alt={p.name} width={96} height={96} />
						<p style={{ margin: '8px 0 4px', textTransform: 'capitalize', fontWeight: 600 }}>
							#{p.id} {p.name}
						</p>
						<div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
							{p.types.map(t => (
								<span
									key={t.slot}
									style={{
										background: TYPE_COLORS[t.typeName],
										color: '#fff',
										borderRadius: '4px',
										padding: '2px 8px',
										fontSize: '12px',
									}}
								>
									{t.typeName}
								</span>
							))}
						</div>
						<p style={{ color: '#666', fontSize: '12px', margin: '8px 0 0' }}>
							{p.height / 10} m · {p.weight / 10} kg
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
