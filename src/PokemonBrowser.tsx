import axios from 'axios';
import { useEffect, useState } from 'react';
import { loadFavoriteIds, saveFavoriteIds, toggleFavorite } from './favorites';

// API endpoint
const POKEAPI_URL = 'https://pokeapi.co/api/v2/pokemon';

// The shape of the list response
interface PokemonListResponse {
	count: number;
	next: string;
	previous: string;
	results: {
		name: string;
		url: string;
	}[];
}

// The shape of the detail response
interface PokemonDetailResponse {
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
	const [pokemon, setPokemon] = useState<PokemonDetailResponse[]>([]);
	const [offset, setOffset] = useState(0);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState('');
	const [favoriteIds, setFavoriteIds] = useState(loadFavoriteIds);
	const [favoritesOnly, setFavoritesOnly] = useState(false);

	// Load the current page and then every detail
	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const list = await axios.get<PokemonListResponse>(
					`${POKEAPI_URL}?limit=20&offset=${String(offset)}`,
				);
				setTotal(list.data.count);

				const details = await Promise.all(
					list.data.results.map(result => axios.get<PokemonDetailResponse>(result.url)),
				);

				setPokemon(details.map(detail => detail.data));
			} catch (error) {
				console.log('Something went wrong', error);
			}
			setLoading(false);
		};

		void load();
	}, [offset]);

	const visible = pokemon
		.filter(p => p.name.includes(filter.toLowerCase()))
		.filter(p => !favoritesOnly || favoriteIds.includes(p.id));

	const handleFavorite = (id: number) => {
		setFavoriteIds(current => {
			const next = toggleFavorite(current, id);
			saveFavoriteIds(next);
			return next;
		});
	};

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
					justifyContent: 'space-between',
					marginTop: '12px',
				}}
			>
				<label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<input
						type="checkbox"
						checked={favoritesOnly}
						onChange={event => {
							setFavoritesOnly(event.target.checked);
						}}
					/>
					Show favorites only
				</label>
				<span style={{ color: '#666', fontSize: '14px' }}>{favoriteIds.length} saved</span>
			</div>

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
						<img src={p.sprites.front_default} alt={p.name} width={96} height={96} />
						<p style={{ margin: '8px 0 4px', textTransform: 'capitalize', fontWeight: 600 }}>
							#{p.id} {p.name}
						</p>
						<div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
							{p.types.map(t => (
								<span
									key={t.slot}
									style={{
										background: TYPE_COLORS[t.type.name],
										color: '#fff',
										borderRadius: '4px',
										padding: '2px 8px',
										fontSize: '12px',
									}}
								>
									{t.type.name}
								</span>
							))}
						</div>
						<p style={{ color: '#666', fontSize: '12px', margin: '8px 0 0' }}>
							{p.height / 10} m · {p.weight / 10} kg
						</p>
						<button
							type="button"
							aria-label={
								favoriteIds.includes(p.id)
									? `Remove ${p.name} from favorites`
									: `Add ${p.name} to favorites`
							}
							aria-pressed={favoriteIds.includes(p.id)}
							onClick={() => {
								handleFavorite(p.id);
							}}
							style={{
								marginTop: '12px',
								padding: '6px 10px',
								borderRadius: '6px',
								border: '1px solid #ccc',
								background: favoriteIds.includes(p.id) ? '#fff4bf' : '#fff',
							}}
						>
							{favoriteIds.includes(p.id) ? '★ Saved' : '☆ Save'}
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
