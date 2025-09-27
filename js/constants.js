// Constants - Application messages and UI text

const CONSTANTS = {
    MESSAGES: {
        INITIALIZING: 'Initializing Weather Dashboard...',
        API_KEY_CONFIGURED: 'API Key configured successfully.',
        API_KEY_NOT_CONFIGURED: 'Weather API key is not configured. Please add your OpenWeatherMap API key to the config.js file.',
        LOADING_WEATHER: 'Loading Weather Data...',
        GETTING_LOCATION: 'Getting location...',
        LOCATION_NOT_SUPPORTED: 'Geolocation is not supported by this browser.',
        LOCATION_DENIED: 'Location access denied by user.',
        LOCATION_UNAVAILABLE: 'Location information is unavailable.',
        LOCATION_TIMEOUT: 'Location request timed out.',
        INVALID_CITY: 'Please enter a valid city name.',
        ENTER_CITY: 'Please enter a city name.',
        SEARCH_ERROR: 'Failed to load weather data for the specified city.',
        API_KEY_ERROR: 'API key error. Please check the configuration.',
        CITY_NOT_FOUND: 'City not found. Please check the spelling and try again.',
        NETWORK_ERROR: 'Network error. Please check your internet connection.',
        INIT_ERROR: 'Failed to initialize the application. Please refresh the page.',
        DEMO_DATA_MESSAGE: 'Using demo data. Please check your API key configuration.',
        UNABLE_TO_LOAD_DATA: 'Unable to load weather data. Please check your configuration.',
        REFRESH_FAILED: 'Failed to refresh weather data.',
        UNKNOWN_LOCATION: 'Unknown Location',
        WEATHER_ICON: 'Weather icon',
        DEFAULT_ERROR: 'Something went wrong. Please try again.'
    },
    UI: {
        CURRENT_LOCATION: 'Current Location',
        SEARCH_PLACEHOLDER: 'Search for a city...',
        UV_INDEX: 'UV Index',
        VISIBILITY: 'Visibility',
        HUMIDITY: 'Humidity',
        WIND_SPEED: 'Wind Speed',
        PRESSURE: 'Pressure',
        CLOUDINESS: 'Cloudiness',
        FEELS_LIKE: 'Feels like',
        HOURLY_FORECAST_TITLE: '24-Hour Forecast',
        DAILY_FORECAST_TITLE: '5-Day Forecast',
        MAP_TITLE: 'Weather Map',
        MAP_PLACEHOLDER: 'Interactive weather map will be displayed here'
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTS;
}
