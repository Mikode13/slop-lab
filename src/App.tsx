import axios from 'axios';
import { useEffect, useState } from 'react';
import PokemonBrowser from './PokemonBrowser';

// API endpoints
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// The shape of the geocoding response
interface GeocodingResponse {
	results: {
		id: number;
		name: string;
		country: string;
		admin1: string;
		latitude: number;
		longitude: number;
	}[];
}

// The shape of the forecast response
interface ForecastResponse {
	current: {
		time: string;
		temperature_2m: number;
		relative_humidity_2m: number;
		weather_code: number;
		wind_speed_10m: number;
	};
}

// Helper to turn a WMO weather code into an emoji
function getWeatherEmoji(code: number): string {
	switch (code) {
		case 0:
			return '☀️';
		case 1:
			return '🌤️';
		case 2:
			return '⛅';
		case 3:
			return '☁️';
		case 45:
			return '🌫️';
		case 48:
			return '🌫️';
		case 51:
			return '🌦️';
		case 53:
			return '🌦️';
		case 55:
			return '🌦️';
		case 61:
			return '🌧️';
		case 63:
			return '🌧️';
		case 65:
			return '🌧️';
		case 71:
			return '🌨️';
		case 73:
			return '🌨️';
		case 75:
			return '❄️';
		case 80:
			return '🌦️';
		case 81:
			return '🌧️';
		case 82:
			return '⛈️';
		case 95:
			return '⛈️';
		case 96:
			return '⛈️';
		case 99:
			return '⛈️';
		default:
			return '🌡️';
	}
}

// Helper to turn a WMO weather code into a description
function getWeatherDescription(code: number): string {
	switch (code) {
		case 0:
			return 'Clear sky';
		case 1:
			return 'Mainly clear';
		case 2:
			return 'Partly cloudy';
		case 3:
			return 'Overcast';
		case 45:
			return 'Fog';
		case 48:
			return 'Depositing rime fog';
		case 51:
			return 'Light drizzle';
		case 53:
			return 'Moderate drizzle';
		case 55:
			return 'Dense drizzle';
		case 61:
			return 'Slight rain';
		case 63:
			return 'Moderate rain';
		case 65:
			return 'Heavy rain';
		case 71:
			return 'Slight snow';
		case 73:
			return 'Moderate snow';
		case 75:
			return 'Heavy snow';
		case 80:
			return 'Slight showers';
		case 81:
			return 'Moderate showers';
		case 82:
			return 'Violent showers';
		case 95:
			return 'Thunderstorm';
		case 96:
			return 'Thunderstorm with hail';
		case 99:
			return 'Thunderstorm with heavy hail';
		default:
			return 'Unknown';
	}
}

export default function App() {
	const [tab, setTab] = useState('weather');
	const [city, setCity] = useState('Madrid');
	const [placeName, setPlaceName] = useState('');
	const [latitude, setLatitude] = useState(0);
	const [longitude, setLongitude] = useState(0);
	const [temperature, setTemperature] = useState(0);
	const [humidity, setHumidity] = useState(0);
	const [wind, setWind] = useState(0);
	const [weatherCode, setWeatherCode] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	// Search for the city once the typing settles
	useEffect(() => {
		const controller = new AbortController();

		const search = async () => {
			setLoading(true);
			try {
				const response = await axios.get<GeocodingResponse>(
					`${GEOCODING_URL}?name=${city}&count=1&language=en&format=json`,
					{ signal: controller.signal },
				);
				const place = response.data.results[0];
				if (place) {
					setPlaceName(place.name + ', ' + place.country);
					setLatitude(place.latitude);
					setLongitude(place.longitude);
				}
			} catch (cause) {
				console.log('Something went wrong', cause);
				setError(`No place matched "${city}".`);
			}
			setLoading(false);
		};

		const timer = setTimeout(() => {
			void search();
		}, 300);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [city]);

	// Load the weather once we have the coordinates
	useEffect(() => {
		const controller = new AbortController();

		const load = async () => {
			setLoading(true);
			try {
				const response = await axios.get<ForecastResponse>(
					`${FORECAST_URL}?latitude=${String(latitude)}&longitude=${String(longitude)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`,
					{ signal: controller.signal },
				);
				setTemperature(response.data.current.temperature_2m);
				setHumidity(response.data.current.relative_humidity_2m);
				setWind(response.data.current.wind_speed_10m);
				setWeatherCode(response.data.current.weather_code);
			} catch (cause) {
				console.log('Something went wrong', cause);
				setError('The weather for that place could not be loaded.');
			}
			setLoading(false);
		};

		void load();

		return () => {
			controller.abort();
		};
	}, [latitude, longitude]);

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

			{tab === 'weather' && (
				<div
					style={{
						background: '#fff',
						borderRadius: '8px',
						padding: '24px',
						border: '1px solid #e0e0e0',
					}}
				>
					<label htmlFor="city" style={{ display: 'block', marginBottom: '8px' }}>
						City
					</label>
					<input
						id="city"
						value={city}
						onChange={event => {
							setCity(event.target.value);
						}}
						style={{
							padding: '8px',
							borderRadius: '6px',
							border: '1px solid #ccc',
							width: '260px',
						}}
					/>

					{loading && <p>Loading...</p>}
					{error !== '' && (
						<p role="alert" style={{ color: '#b00020', margin: '8px 0 0' }}>
							{error}
						</p>
					)}

					<div style={{ marginTop: '24px' }}>
						<h2 style={{ margin: '0 0 8px' }}>{placeName}</h2>
						<div style={{ fontSize: '64px', lineHeight: '1' }}>{getWeatherEmoji(weatherCode)}</div>
						<p style={{ fontSize: '32px', margin: '8px 0' }}>{Math.round(temperature)}°C</p>
						<p style={{ color: '#666', margin: '0' }}>{getWeatherDescription(weatherCode)}</p>
						<p style={{ color: '#666', margin: '4px 0 0' }}>
							Humidity {humidity}% · Wind {wind} km/h
						</p>
					</div>
				</div>
			)}

			{tab === 'pokemon' && <PokemonBrowser />}
		</div>
	);
}
