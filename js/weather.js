// Weather API Handler - Manages all OpenWeatherMap API interactions

/**
 * WeatherAPI - Main class for weather data operations
 */
class WeatherAPI {
    constructor() {
        // Initialize API configuration
        this.API_KEY = (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_API_KEY) || 'YOUR_API_KEY_HERE';
        this.BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_BASE_URL) || 'https://api.openweathermap.org/data/2.5';
        this.GEOCODING_URL = (typeof CONFIG !== 'undefined' && CONFIG.OPENWEATHER_GEOCODING_URL) || 'https://api.openweathermap.org/geo/1.0';
        
        // Setup caching and rate limiting
        this.CACHE_DURATION = (typeof CONFIG !== 'undefined' && CONFIG.CACHE_DURATION) || 5 * 60 * 1000;
        this.cache = new Map();
        this.requestCount = 0;
        this.requestWindow = Date.now();
        this.maxRequestsPerMinute = (typeof CONFIG !== 'undefined' && CONFIG.API_RATE_LIMIT) || 60;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        
        // Search debouncing variables
        this.lastSearchQuery = '';
        this.lastSearchTime = 0;
        this.lastSearchResults = [];
    }

    /** Check if API key is configured */
    isApiKeySet() {
        return this.API_KEY && 
               this.API_KEY !== 'YOUR_API_KEY_HERE' && 
               this.API_KEY !== '' && 
               this.API_KEY.length > 10;
    }

    /** Generate cache key */
    getCacheKey(type, identifier) {
        return `${type}_${identifier}`;
    }

    /** Check if cached data is still valid */
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
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'WeatherDashboard/1.0'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format. Expected JSON.');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('API request timed out');
                throw new Error('Request timed out. Please try again.');
            }
            console.error('API request failed:', error.message);
            throw new Error(`Weather data request failed: ${error.message}`);
        }
    }

    /** Get current weather for city */
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
     * Get UV index data using One Call API
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} UV index and additional data
     */
    async getUVIndex(lat, lon) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured. Please set your OpenWeatherMap API key.');
        }

        const cacheKey = this.getCacheKey('uv', `${lat},${lon}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached UV data for coordinates:', lat, lon);
            return cachedData;
        }

        // Try multiple UV index sources (free tier compatible)
        try {
            // First try the dedicated UV index endpoint (if available in free tier)
            let url = `${this.BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${this.API_KEY}`;
            
            try {
                const uvData = await this.makeRequest(url);
                const formattedData = {
                    current: {
                        uvi: this.parseUVValue(uvData)
                    }
                };
                this.setCachedData(cacheKey, formattedData);
                console.log('✅ UV index loaded from UV endpoint:', formattedData.current.uvi);
                return formattedData;
            } catch (uvError) {
                console.log('UV endpoint not available, trying One Call API...');
                
                // Fallback to One Call API (may require subscription)
                url = `${this.BASE_URL}/onecall?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric&exclude=minutely,daily,alerts`;
                const oneCallData = await this.makeRequest(url);
                this.setCachedData(cacheKey, oneCallData);
                console.log('✅ UV index loaded from One Call API:', oneCallData.current?.uvi);
                return oneCallData;
            }
        } catch (error) {
            // All UV sources failed - use estimated UV based on time and conditions
            console.warn('⚠️ UV index API unavailable, using estimated values');
            const estimatedUV = this.estimateUVIndex(lat, lon);
            const simulatedData = {
                current: { uvi: estimatedUV },
                simulated: true
            };
            this.setCachedData(cacheKey, simulatedData);
            return simulatedData;
        }
    }

    /**
     * Parse UV value from API response with proper error handling
     * @param {*} uvData - UV data from API
     * @returns {number} Parsed UV index value
     */
    parseUVValue(uvData) {
        if (typeof uvData === 'number' && !isNaN(uvData)) {
            return Math.max(0, Math.min(11, uvData));
        }
        
        if (typeof uvData === 'object' && uvData !== null) {
            const uvValue = uvData.value || uvData.uvi || uvData.current?.uvi;
            if (typeof uvValue === 'number' && !isNaN(uvValue)) {
                return Math.max(0, Math.min(11, uvValue));
            }
        }
        
        console.warn('Invalid UV data received, using fallback value');
        return 0; // Safe fallback
    }

    /**
     * Estimate UV index based on time, location, and season
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude  
     * @returns {number} Estimated UV index (0-11)
     */
    estimateUVIndex(lat, lon) {
        const now = new Date();
        const hour = now.getHours();
        const month = now.getMonth() + 1; // 1-12
        
        // Base UV index estimation for India (lat 8-37°N)
        let baseUV = 0;
        
        // Time-based calculation (UV peaks around noon)
        if (hour < 6 || hour > 18) {
            baseUV = 0; // No UV during night
        } else if (hour >= 10 && hour <= 14) {
            baseUV = 8; // Peak hours
        } else if (hour >= 8 && hour <= 16) {
            baseUV = 6; // Moderate hours
        } else {
            baseUV = 3; // Early morning/late afternoon
        }
        
        // Seasonal adjustment for India
        if (month >= 4 && month <= 6) {
            baseUV += 2; // Summer months (higher UV)
        } else if (month >= 11 || month <= 2) {
            baseUV -= 1; // Winter months (lower UV)
        }
        
        // Latitude adjustment (closer to equator = higher UV)
        const INDIAN_LAT_BASELINE = 30; // Northern boundary of India
        const UV_LAT_MULTIPLIER = 2; // UV increase factor per latitude degree
        const latFactor = (INDIAN_LAT_BASELINE - Math.abs(lat)) / INDIAN_LAT_BASELINE;
        baseUV += latFactor * UV_LAT_MULTIPLIER;
        
        // Ensure UV is within valid range (0-11)
        const estimatedUV = Math.max(0, Math.min(11, Math.round(baseUV * 10) / 10));
        
        console.log(`📊 Estimated UV index: ${estimatedUV} (Time: ${hour}:00, Month: ${month}, Lat: ${lat})`);
        return estimatedUV;
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
            let currentWeather, forecast, uvData = null;

            if (location.city) {
                [currentWeather, forecast] = await Promise.all([
                    this.getCurrentWeather(location.city),
                    this.getForecast(location.city)
                ]);
                
                // Get UV index using coordinates from current weather
                if (currentWeather?.coord) {
                    try {
                        uvData = await this.getUVIndex(currentWeather.coord.lat, currentWeather.coord.lon);
                    } catch (error) {
                        console.warn('Failed to get UV index:', error.message);
                        // Provide fallback UV estimation
                        uvData = {
                            current: { uvi: this.estimateUVIndex(currentWeather.coord.lat, currentWeather.coord.lon) },
                            simulated: true
                        };
                    }
                }
            } else if (location.lat && location.lon) {
                [currentWeather, forecast, uvData] = await Promise.all([
                    this.getCurrentWeatherByCoords(location.lat, location.lon),
                    this.getForecastByCoords(location.lat, location.lon),
                    this.getUVIndex(location.lat, location.lon).catch(error => {
                        console.warn('Failed to get UV index:', error.message);
                        return null;
                    })
                ]);
            } else {
                throw new Error('Invalid location parameters');
            }

            return {
                current: currentWeather,
                forecast: forecast,
                uvData: uvData,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error getting complete weather data:', error.message);
            throw error;
        }
    }

    /**
     * Search for cities using geocoding API with debouncing
     * @param {string} query - City search query
     * @param {number} limit - Maximum number of results (default: 5)
     * @returns {Promise<Array>} Array of city suggestions
     */
    async searchCities(query, limit = 5) {
        if (!this.isApiKeySet()) {
            throw new Error('API key not configured.');
        }

        if (!query || query.length < 2) {
            return [];
        }

        // Debounce rapid queries
        const queryKey = query.toLowerCase().trim();
        if (this.lastSearchQuery === queryKey && (Date.now() - this.lastSearchTime) < 300) {
            return this.lastSearchResults || [];
        }

        const cacheKey = this.getCacheKey('cities', queryKey);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached city suggestions for:', query);
            this.lastSearchQuery = queryKey;
            this.lastSearchTime = Date.now();
            this.lastSearchResults = cachedData;
            return cachedData;
        }

        try {
            // Optimize limit calculation
            const SEARCH_MULTIPLIER = 3;
            const MAX_SEARCH_RESULTS = 20;
            const searchLimit = Math.min(limit * SEARCH_MULTIPLIER, MAX_SEARCH_RESULTS);
            
            const encodedQuery = encodeURIComponent(queryKey);
            const url = `${this.GEOCODING_URL}/direct?q=${encodedQuery},IN&limit=${this.validateLimit(searchLimit)}&appid=${this.API_KEY}`;
            const data = await this.makeRequest(url);
            
            // Filter and format results efficiently
            const formattedData = data
                .filter(city => city.country === 'IN' || city.country === 'India')
                .map(city => {
                    const displayName = city.state ? `${city.name}, ${city.state}` : city.name;
                    return {
                        name: city.name,
                        country: city.country,
                        state: city.state || '',
                        lat: city.lat,
                        lon: city.lon,
                        displayName
                    };
                })
                .slice(0, limit);
            
            console.log(`Found ${formattedData.length} Indian cities for "${query}"`);
            
            // Cache and store for debouncing
            this.setCachedData(cacheKey, formattedData);
            this.lastSearchQuery = queryKey;
            this.lastSearchTime = Date.now();
            this.lastSearchResults = formattedData;
            
            return formattedData;
        } catch (error) {
            console.error('City search failed:', error.message);
            throw new Error(`City search failed: ${error.message}`);
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