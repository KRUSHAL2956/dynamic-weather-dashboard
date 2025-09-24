// Configuration template for Dynamic Weather Dashboard
// Copy this file to config.js and add your actual API key
// DO NOT commit config.js with real API keys to version control

const CONFIG = {
    // Replace with your actual OpenWeatherMap API key
    // Get your free API key from: https://openweathermap.org/api
    OPENWEATHER_API_KEY: 'YOUR_API_KEY_HERE',
    
    // API endpoints
    OPENWEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5',
    OPENWEATHER_GEOCODING_URL: 'https://api.openweathermap.org/geo/1.0',
    
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