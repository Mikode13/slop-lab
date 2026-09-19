import { useState } from 'react';
import PokemonBrowser from './pokemon/ui/PokemonBrowser';
import WeatherPage from './weather/ui/WeatherPage';

type TabsType = 'weather' | 'pokemon';

export default function App() {
	const [tab, setTab] = useState<TabsType>('weather');

	return (
		<div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
			<h1 style={{ fontSize: '28px', marginBottom: '4px' }}>🧪 slop-lab</h1>
			<p style={{ color: '#666', marginTop: '0' }}>
				Two public APIs, one demo application, zero design decisions.
			</p>

			<div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
				<button
					type="button"
					onClick={() => {
						setTab('weather');
					}}
					style={{
						padding: '8px 16px',
						borderRadius: '6px',
						border: '1px solid #ccc',
						background: tab === 'weather' ? '#1a1a1a' : '#fff',
						color: tab === 'weather' ? '#fff' : '#1a1a1a',
					}}
				>
					Weather
				</button>
				<button
					type="button"
					onClick={() => {
						setTab('pokemon');
					}}
					style={{
						padding: '8px 16px',
						borderRadius: '6px',
						border: '1px solid #ccc',
						background: tab === 'pokemon' ? '#1a1a1a' : '#fff',
						color: tab === 'pokemon' ? '#fff' : '#1a1a1a',
					}}
				>
					Pokémon
				</button>
			</div>

			{tab === 'weather' && <WeatherPage />}

			{tab === 'pokemon' && <PokemonBrowser />}
		</div>
	);
}
