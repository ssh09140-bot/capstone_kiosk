"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentWeather = getCurrentWeather;
const axios_1 = __importDefault(require("axios"));
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
// TODO: Replace with dynamic store location. Using Seoul as a default for now.
const LATITUDE = 37.5665;
const LONGITUDE = 126.9780;
/**
 * Fetches the current weather for a given location.
 * @returns {Promise<WeatherData | null>} The current weather data or null if an error occurs.
 */
async function getCurrentWeather() {
    if (!OPENWEATHER_API_KEY) {
        console.warn('OPENWEATHER_API_KEY is not set. Skipping weather fetch.');
        return null;
    }
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}&lon=${LONGITUDE}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;
    try {
        const response = await axios_1.default.get(url);
        const data = response.data;
        if (data && data.weather && data.weather[0] && data.main) {
            return {
                weather: data.weather[0].main, // e.g., "Rain", "Clouds", "Clear"
                temperature: data.main.temp, // Temperature in Celsius
            };
        }
        return null;
    }
    catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}
