// Configuration template for Dynamic Weather Dashboard
// INSTRUCTIONS:
// 1. Copy this file to config.js: cp config-template.js config.js
// 2. Replace YOUR_API_KEY_HERE with your actual OpenWeatherMap API key
// 3. Never commit config.js to version control

const CONFIG = {
    // OpenWeatherMap API key - Get yours from https://openweathermap.org/api
    OPENWEATHER_API_KEY: 'YOUR_API_KEY_HERE',
    
    // API endpoints
    OPENWEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5',
    OPENWEATHER_GEOCODING_URL: 'https://api.openweathermap.org/geo/1.0',
    OPENWEATHER_TILES_URL: 'https://tile.openweathermap.org/map',
    
    // Cache settings
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    
    // Geolocation settings
    GEOLOCATION_TIMEOUT: 10000, // 10 seconds
    GEOLOCATION_MAX_AGE: 60000, // 1 minute
    
    // Rate limiting
    API_RATE_LIMIT: 60, // requests per minute
    
    // Default settings
    DEFAULT_CITY: 'London',
    DEFAULT_UNITS: 'metric'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}