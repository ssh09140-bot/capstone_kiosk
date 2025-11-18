import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
// TODO: Replace with dynamic store location. Using Seoul as a default for now.
const LATITUDE = 37.5665;
const LONGITUDE = 126.9780;

interface WeatherData {
    weather: string;
    temperature: number;
}

/**
 * Fetches the current weather for a given location.
 * @returns {Promise<WeatherData | null>} The current weather data or null if an error occurs.
 */
export async function getCurrentWeather(): Promise<WeatherData | null> {
    if (!OPENWEATHER_API_KEY) {
        console.warn('OPENWEATHER_API_KEY is not set. Skipping weather fetch.');
        return null;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}&lon=${LONGITUDE}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (data && data.weather && data.weather[0] && data.main) {
            return {
                weather: data.weather[0].main, // e.g., "Rain", "Clouds", "Clear"
                temperature: data.main.temp, // Temperature in Celsius
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}
