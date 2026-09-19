import { useEffect, useState } from 'react';
import getForecastUseCase from '../application/getForecastUseCase';

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

const DEFAULT_VALUES = {
	city: 'Madrid',
	country: 'Spain',
	placeName: '',
	temperature: 0,
	humidity: 0,
	wind: 0,
	weatherCode: 0,
};

export default function WeatherPage() {
	const [city, setCity] = useState(DEFAULT_VALUES.city);
	const [country, setCountry] = useState(DEFAULT_VALUES.country);
	const [placeName, setPlaceName] = useState(DEFAULT_VALUES.placeName);
	const [temperature, setTemperature] = useState(DEFAULT_VALUES.temperature);
	const [humidity, setHumidity] = useState(DEFAULT_VALUES.humidity);
	const [wind, setWind] = useState(DEFAULT_VALUES.wind);
	const [weatherCode, setWeatherCode] = useState(DEFAULT_VALUES.weatherCode);
	const [loading, setLoading] = useState(false);

	// Search for the city as the user types
	useEffect(() => {
		const search = async () => {
			if (!city || city.length < 2) {
				setCountry('');
				setPlaceName(DEFAULT_VALUES.placeName);
				setTemperature(DEFAULT_VALUES.temperature);
				setHumidity(DEFAULT_VALUES.humidity);
				setWind(DEFAULT_VALUES.wind);
				setWeatherCode(DEFAULT_VALUES.weatherCode);
				return;
			}

			setLoading(true);

			try {
				const weather = await getForecastUseCase(city);

				setTemperature(weather.temperature2m);
				setCountry(weather.country);
				setHumidity(weather.relativehumidity2m);
				setWind(weather.windSpeed10m);
				setWeatherCode(weather.weatherCode);
				setPlaceName(weather.location);
			} catch (error) {
				console.error('Something went wrong', error);
			}
			setLoading(false);
		};

		void search();
	}, [city]);

	return (
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

			{city.length >= 2 ? (
				<div style={{ marginTop: '24px' }}>
					<h2 style={{ margin: '0 0 8px' }}>{`${placeName}, ${country}`}</h2>
					<div style={{ fontSize: '64px', lineHeight: '1' }}>{getWeatherEmoji(weatherCode)}</div>
					<p style={{ fontSize: '32px', margin: '8px 0' }}>{Math.round(temperature)}°C</p>
					<p style={{ color: '#666', margin: '0' }}>{getWeatherDescription(weatherCode)}</p>
					<p style={{ color: '#666', margin: '4px 0 0' }}>
						Humidity {humidity}% · Wind {wind} km/h
					</p>
				</div>
			) : (
				<div>
					<p>Please introduce a valid city name in order to start</p>
				</div>
			)}
		</div>
	);
}
