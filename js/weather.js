// Weather API Handler for Dynamic Weather Dashboard

/**
 * Weather API class to handle all weather-related API calls
 */
class WeatherAPI {
    constructor() {
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
               this.API_KEY.length > 10;
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
            this.checkRateLimit();
            this.validateUrl(url);
            
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
     * Get complete weather data (current + forecast) for a location
     * @param {Object} location - Location object with city or lat/lon
     * @returns {Promise<Object>} Complete weather data
     */
    async getCompleteWeatherData(location) {
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
            console.error('Error getting complete weather data:', error.message);
            throw error;
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
                    dt: baseTime + (i * 3 * 3600),
                    main: { 
                        temp: 22 + Math.sin(i * 0.5) * 5,
                        humidity: 60 + Math.sin(i * 0.3) * 10
                    },
                    weather: [{ 
                        main: "Clear", 
                        description: "clear sky", 
                        icon: i % 8 < 4 ? "01d" : "01n"
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
            
            const allowedHosts = [
                'api.openweathermap.org',
                'openweathermap.org'
            ];
            
            if (!allowedHosts.includes(urlObj.hostname)) {
                throw new Error('Invalid API endpoint');
            }
            
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
            return 5;
        }
        return numLimit;
    }
}

// Export the WeatherAPI class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherAPI;
}