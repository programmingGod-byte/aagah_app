import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@env';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const BIGDATACLOUD_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

export const fetchWeatherData = async (latitude, longitude) => {
    try {
        const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`;
        console.log('Fetching weather from:', url);
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
};

export const fetchLocationName = async (latitude, longitude) => {
    try {
        console.log(`Fetching location for lat: ${latitude}, lon: ${longitude}`);

        // Primary: BigDataCloud (Free, No Key) - More reliable without paid Google Setup
        const url = `${BIGDATACLOUD_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
        console.log('Geocoding URL:', url);

        const response = await axios.get(url);

        // BigDataCloud returns separate fields
        if (response.data) {
            const { city, locality, principalSubdivision } = response.data;
            // Construct logic: "City, State" or "Locality, City"
            // Example: "Kamand, Himachal Pradesh"

            const parts = [];
            if (locality && locality !== city) parts.push(locality);
            if (city) parts.push(city);
            if (!city && !locality && principalSubdivision) parts.push(principalSubdivision);

            if (parts.length > 0) return parts.join(', ');
            return response.data.localityInfo?.informative?.[0]?.name || 'Unknown Location';
        }

        return 'Unknown Location';
    } catch (error) {
        console.warn('BigDataCloud Geocoding failed, trying Google as fallback...');
        return fetchLocationFromGoogle(latitude, longitude);
    }
};

const fetchLocationFromGoogle = async (latitude, longitude) => {
    try {
        const url = `${GOOGLE_GEOCODING_URL}?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await axios.get(url);

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const result = response.data.results[0];
            let locality = '';
            let adminArea = '';

            for (let comp of result.address_components) {
                if (comp.types.includes('locality')) {
                    locality = comp.long_name;
                }
                if (comp.types.includes('administrative_area_level_1')) {
                    adminArea = comp.long_name;
                }
            }

            if (locality && adminArea) {
                return `${locality}, ${adminArea}`;
            }

            return result.formatted_address;
        } else {
            console.warn('Google Geocoding failed:', response.data.status, response.data.error_message);
            return 'Unknown Location';
        }
    } catch (error) {
        console.error('Error fetching location name (Google):', error);
        return 'Unknown Location';
    }
}

// WMO Weather interpretation codes
export const getWeatherDescription = (code) => {
    switch (code) {
        case 0: return 'Clear sky';
        case 1: return 'Mainly clear';
        case 2: return 'Partly cloudy';
        case 3: return 'Overcast';
        case 45: return 'Fog';
        case 48: return 'Depositing rime fog';
        case 51: return 'Drizzle: Light';
        case 53: return 'Drizzle: Moderate';
        case 55: return 'Drizzle: Dense intensity';
        case 61: return 'Rain: Slight';
        case 63: return 'Rain: Moderate';
        case 65: return 'Rain: Heavy intensity';
        case 71: return 'Snow fall: Slight';
        case 73: return 'Snow fall: Moderate';
        case 75: return 'Snow fall: Heavy intensity';
        case 77: return 'Snow grains';
        case 80: return 'Rain showers: Slight';
        case 81: return 'Rain showers: Moderate';
        case 82: return 'Rain showers: Violent';
        case 85: return 'Snow showers slight';
        case 86: return 'Snow showers heavy';
        case 95: return 'Thunderstorm: Slight or moderate';
        case 96: return 'Thunderstorm with slight hail';
        case 99: return 'Thunderstorm with heavy hail';
        default: return 'Unknown';
    }
};
