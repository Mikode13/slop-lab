import { useEffect, useState } from 'react';
import type { PokemonDetailModel } from '../domain/models/detailModel.js';
import { getAllPokemonDetailsUseCase } from '../application/useCases/getAllPokemonDetailsUseCase.js';

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
				const list = await getAllPokemonDetailsUseCase(offset, 20);
				setTotal(list.count);
				setPokemons(list.results);
			} catch (error) {
				console.log('Something went wrong', error);
			}
			setLoading(false);
		};

		void load();
	}, [offset]);

	const visible = pokemons.filter(p => p.name.includes(filter.toLowerCase()));

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
						setOffset(offset - 20);
					}}
					style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc' }}
				>
					Previous
				</button>
				<span style={{ color: '#666' }}>
					Page {offset / 20 + 1} of {Math.ceil(total / 20)}
				</span>
				<button
					type="button"
					disabled={offset + 20 >= total}
					onClick={() => {
						setOffset(offset + 20);
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
