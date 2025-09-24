// Weather API Handler for Dynamic Weather Dashboard

/**
 * Weather API class to handle all weather-related API calls
 */
class WeatherAPI {
    constructor() {
        // Debug: Check if CONFIG is available
        console.log('🔧 CONFIG object available:', typeof CONFIG !== 'undefined');
        if (typeof CONFIG !== 'undefined') {
            console.log('🔑 CONFIG.OPENWEATHER_API_KEY:', CONFIG.OPENWEATHER_API_KEY ? 'Set' : 'Not set');
        }
        
        // Load configuration from config file
        this.API_KEY = (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_API_KEY) || 'YOUR_API_KEY_HERE';
        this.BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_BASE_URL) || 'https://api.openweathermap.org/data/2.5';

        this.GEOCODING_URL = (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_GEOCODING_URL) || 'https://api.openweathermap.org/geo/1.0';
        
        // Cache settings
        this.CACHE_DURATION = (typeof CONFIG !== 'undefined' && CONFIG.CACHE_DURATION) || 5 * 60 * 1000;
        this.cache = new Map();
        
        // Rate limiting
        this.requestCount = 0;
        this.requestWindow = Date.now();
        this.maxRequestsPerMinute = (typeof CONFIG !== 'undefined' && CONFIG.API_RATE_LIMIT) || 60;
        
        // Cache statistics
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * Check if API key is set
     * @returns {boolean} Whether API key is configured
     */
    isApiKeySet() {
        return this.API_KEY && 
               this.API_KEY !== 'YOUR_API_KEY_HERE' && 
               this.API_KEY !== '' && 
               this.API_KEY.length > 10; // OpenWeatherMap API keys are typically 32 characters
    }

    /**
     * Generate cache key for requests
     * @param {string} type - Request type
     * @param {string} identifier - City name or coordinates
     * @returns {string} Cache key
     */
    getCacheKey(type, identifier) {
        return `${type}_${identifier}`;
    }

    /**
     * Check if cached data is still valid
     * @param {Object} cacheEntry - Cached data entry
     * @returns {boolean} Whether cache is valid
     */
    isCacheValid(cacheEntry) {
        return cacheEntry && cacheEntry.timestamp && (Date.now() - cacheEntry.timestamp < this.CACHE_DURATION);
    }

    /**
     * Get cached data if valid
     * @param {string} key - Cache key
     * @returns {Object|null} Cached data or null
     */
    getCachedData(key) {
        const cacheEntry = this.cache.get(key);
        if (this.isCacheValid(cacheEntry)) {
            this.cacheHits++;
            return cacheEntry.data;
        }
        this.cacheMisses++;
        return null;
    }

    /**
     * Cache data with timestamp
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     */
    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Make API request with error handling
     * @param {string} url - API endpoint URL
     * @returns {Promise<Object>} API response data
     */
    async makeRequest(url) {
        try {
            // Rate limiting check
            this.checkRateLimit();
            
            // Validate URL to prevent SSRF
            this.validateUrl(url);
            
            // Log request without exposing API key
            const sanitizedUrl = url.replace(/appid=[^&]+/, 'appid=***');
            console.log('Making API request to:', sanitizedUrl);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error.message);
            throw new Error(`Weather data request failed: ${error.message}`);
        }
    }

    /**
     * Get current weather data for a city
     * @param {string} city - City name
     * @returns {Promise<Object>} Current weather data
     */
    async getCurrentWeather(city) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured. Please set your OpenWeatherMap API key.');
        }

        const cacheKey = this.getCacheKey('current', city.toLowerCase());
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached current weather data for:', city);
            return cachedData;
        }

        const url = `${this.BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${this.API_KEY}&units=metric`;
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get current weather data by coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Current weather data
     */
    async getCurrentWeatherByCoords(lat, lon) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured. Please set your OpenWeatherMap API key.');
        }

        const cacheKey = this.getCacheKey('current', `${lat},${lon}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached current weather data for coordinates:', lat, lon);
            return cachedData;
        }

        const url = `${this.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get 5-day weather forecast for a city
     * @param {string} city - City name
     * @returns {Promise<Object>} 5-day forecast data
     */
    async getForecast(city) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured. Please set your OpenWeatherMap API key.');
        }

        const cacheKey = this.getCacheKey('forecast', city.toLowerCase());
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached forecast data for:', city);
            return cachedData;
        }

        const url = `${this.BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${this.API_KEY}&units=metric`;
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get 5-day weather forecast by coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} 5-day forecast data
     */
    async getForecastByCoords(lat, lon) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured. Please set your OpenWeatherMap API key.');
        }

        const cacheKey = this.getCacheKey('forecast', `${lat},${lon}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached forecast data for coordinates:', lat, lon);
            return cachedData;
        }

        const url = `${this.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Search for cities by name (geocoding)
     * @param {string} cityName - City name to search
     * @param {number} limit - Maximum number of results (1-5)
     * @returns {Promise<Array>} Array of city data
     */
    async searchCities(cityName, limit = 5) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured. Please set your OpenWeatherMap API key.');
        }
        
        // Validate and sanitize limit parameter
        const validLimit = this.validateLimit(limit);

        const cacheKey = this.getCacheKey('geocoding', `${cityName.toLowerCase()}_${validLimit}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached city search data for:', cityName);
            return cachedData;
        }

        const url = `${this.GEOCODING_URL}/direct?q=${encodeURIComponent(cityName)}&limit=${validLimit}&appid=${this.API_KEY}`;
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get city name from coordinates (reverse geocoding)
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Array>} Array with city data
     */
    async getCityFromCoords(lat, lon) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured. Please set your OpenWeatherMap API key.');
        }

        const cacheKey = this.getCacheKey('reverse_geocoding', `${lat},${lon}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached reverse geocoding data for:', lat, lon);
            return cachedData;
        }

        const url = `${this.GEOCODING_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.API_KEY}`;
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp >= this.CACHE_DURATION) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cached data
     */
    clearAllCache() {
        this.cache.clear();
        console.log('All cached data cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const entry of this.cache.values()) {
            if (entry.timestamp && now - entry.timestamp < this.CACHE_DURATION) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            cacheHitRate: (this.cacheHits + this.cacheMisses) > 0 ? 
                (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100) : 0
        };
    }

    /**
     * Get comprehensive weather data using One Call API 3.0
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {Array} exclude - Optional array of data blocks to exclude
     * @returns {Promise<Object>} Comprehensive weather data
     */
    async getOneCallWeatherData(lat, lon, exclude = []) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured. Please set your OpenWeatherMap API key.');
        }

        const cacheKey = this.getCacheKey('onecall', `${lat},${lon}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached One Call data for coordinates:', lat, lon);
            return cachedData;
        }

        try {
            const excludeParam = exclude.length > 0 ? `&exclude=${exclude.join(',')}` : '';
            const url = `${this.ONECALL_URL}?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric${excludeParam}`;
            const data = await this.makeRequest(url);
            
            this.setCachedData(cacheKey, data);
            return data;
        } catch (error) {
            console.warn('One Call API failed, falling back to basic APIs:', error.message);
            // Fallback to basic APIs if One Call API fails
            return await this.getCompleteWeatherDataFallback({ lat, lon });
        }
    }

    /**
     * Get complete weather data (current + forecast) for a location
     * @param {Object} location - Location object with city or lat/lon
     * @returns {Promise<Object>} Complete weather data
     */
    async getCompleteWeatherData(location) {
        try {
            // If we have coordinates, try One Call API 3.0 first
            if (location.lat && location.lon) {
                try {
                    const oneCallData = await this.getOneCallWeatherData(location.lat, location.lon);
                    
                    // Transform One Call API data to match expected format
                    return {
                        current: {
                            ...oneCallData.current,
                            name: await this.getCityNameFromCoords(location.lat, location.lon)
                        },
                        forecast: {
                            list: oneCallData.hourly ? oneCallData.hourly.slice(0, 40) : []
                        },
                        daily: oneCallData.daily || [],
                        alerts: oneCallData.alerts || [],
                        timestamp: Date.now()
                    };
                } catch (error) {
                    console.warn('One Call API failed, using fallback:', error.message);
                    return await this.getCompleteWeatherDataFallback(location);
                }
            } else {
                // For city searches, use the fallback method
                return await this.getCompleteWeatherDataFallback(location);
            }
        } catch (error) {
            console.error('Error getting complete weather data:', error.message);
            throw error;
        }
    }

    /**
     * Fallback method using basic APIs when One Call API is not available
     * @param {Object} location - Location object with city or lat/lon
     * @returns {Promise<Object>} Complete weather data
     */
    async getCompleteWeatherDataFallback(location) {
        try {
            let currentWeather, forecast;

            if (location.city) {
                [currentWeather, forecast] = await Promise.all([
                    this.getCurrentWeather(location.city),
                    this.getForecast(location.city)
                ]);
            } else if (location.lat && location.lon) {
                [currentWeather, forecast] = await Promise.all([
                    this.getCurrentWeatherByCoords(location.lat, location.lon),
                    this.getForecastByCoords(location.lat, location.lon)
                ]);
            } else {
                throw new Error('Invalid location parameters');
            }

            return {
                current: currentWeather,
                forecast: forecast,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error getting fallback weather data:', error.message);
            throw error;
        }
    }

    /**
     * Helper method to get city name from coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<string>} City name
     */
    async getCityNameFromCoords(lat, lon) {
        try {
            const locationData = await this.getCityFromCoords(lat, lon);
            return locationData[0]?.name || 'Unknown Location';
        } catch (error) {
            return 'Unknown Location';
        }
    }

    /**
     * Get demo weather data for testing purposes
     * @returns {Object} Demo weather data
     */
    getDemoWeatherData() {
        const baseTime = Math.floor(Date.now() / 1000);
        
        return {
            current: {
                name: "Demo City",
                sys: { country: "DEMO" },
                main: {
                    temp: 22,
                    feels_like: 24,
                    humidity: 65,
                    pressure: 1013
                },
                weather: [{
                    main: "Clear",
                    description: "clear sky",
                    icon: "01d"
                }],
                wind: {
                    speed: 3.5,
                    deg: 180
                },
                visibility: 10000,
                clouds: {
                    all: 0
                },
                coord: {
                    lat: 40.7128,
                    lon: -74.0060
                },
                dt: baseTime
            },
            forecast: {
                list: Array.from({ length: 40 }, (_, i) => ({
                    dt: baseTime + (i * 3 * 3600), // Every 3 hours
                    main: { 
                        temp: 22 + Math.sin(i * 0.5) * 5, // Simulate temperature variation
                        humidity: 60 + Math.sin(i * 0.3) * 10
                    },
                    weather: [{ 
                        main: "Clear", 
                        description: "clear sky", 
                        icon: i % 8 < 4 ? "01d" : "01n" // Day/night cycle
                    }],
                    wind: { speed: 2.5 + Math.random() * 2 }
                }))
            },
            timestamp: Date.now()
        };
    }
    
    /**
     * Check rate limiting
     */
    checkRateLimit() {
        const now = Date.now();
        const oneMinute = 60 * 1000;
        
        // Reset counter if window has passed
        if (now - this.requestWindow > oneMinute) {
            this.requestCount = 0;
            this.requestWindow = now;
        }
        
        if (this.requestCount >= this.maxRequestsPerMinute) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
        
        this.requestCount++;
    }
    
    /**
     * Validate URL to prevent SSRF attacks
     * @param {string} url - URL to validate
     */
    validateUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Only allow OpenWeatherMap domains
            const allowedHosts = [
                'api.openweathermap.org',
                'openweathermap.org'
            ];
            
            if (!allowedHosts.includes(urlObj.hostname)) {
                throw new Error('Invalid API endpoint');
            }
            
            // Only allow HTTPS
            if (urlObj.protocol !== 'https:') {
                throw new Error('Only HTTPS requests are allowed');
            }
            
        } catch (error) {
            throw new Error(`Invalid URL: ${error.message}`);
        }
    }
    
    /**
     * Validate and sanitize limit parameter
     * @param {number} limit - Limit value to validate
     * @returns {number} Valid limit value
     */
    validateLimit(limit) {
        const numLimit = parseInt(limit, 10);
        if (isNaN(numLimit) || numLimit < 1 || numLimit > 5) {
            return 5; // Default safe value
        }
        return numLimit;
    }
}

// Export the WeatherAPI class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherAPI;
}