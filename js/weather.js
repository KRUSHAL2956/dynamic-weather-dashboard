// Weather API Handler - Optimized version

/**
 * WeatherAPI - Main class for weather data operations
 * Optimized for performance, error handling, and code maintainability
 */
class WeatherAPI {
    constructor() {
        // Get configuration from global CONFIG or use defaults
        const config = window.CONFIG || {};
        
        // API configuration with fallbacks
        this.API_KEY = 'ecd10e5059b846b4977031d32d044f69'; // Directly set the API key
        this.BASE_URL = config.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5';
        this.GEOCODING_URL = config.OPENWEATHER_GEOCODING_URL || 'https://api.openweathermap.org/geo/1.0';
        
        // Cache configuration
        this.CACHE_DURATION = config.CACHE_DURATION || 5 * 60 * 1000; // 5 minutes default
        this.MAX_CACHE_SIZE = config.MAX_CACHE_SIZE || 100;
        this.cache = new Map();
        
        // Rate limiting
        this.requestCount = 0;
        this.requestWindow = Date.now();
        this.maxRequestsPerMinute = config.API_RATE_LIMIT || 60;
        this.API_TIMEOUT = config.API_REQUEST_TIMEOUT || 10000;
        
        // Performance metrics
        this.cacheHits = 0;
        this.cacheMisses = 0;
        
        // Debouncing for search
        this.lastSearchQuery = '';
        this.lastSearchTime = 0;
        this.lastSearchResults = [];
        this.SEARCH_DEBOUNCE_TIME = 500; // ms
        
        // Run initial cache cleanup
        this.cleanCache();
        
        console.log('🌦️ Weather API service initialized');
    }

    /**
     * Check if API key is configured properly
     * @returns {boolean} True if API key is valid
     */
    isApiKeySet() {
        if (this.BASE_URL.includes('openweathermap.org')) {
            return this.API_KEY && this.API_KEY !== 'YOUR_API_KEY_HERE' && this.API_KEY.length > 10;
        }
        return true; // Always true when using serverless proxy
    }

    // ===== CACHE MANAGEMENT =====
    
    /**
     * Generate cache key from type and identifier
     * @param {string} type - Cache type (e.g., 'current', 'forecast')
     * @param {string} identifier - Unique identifier (e.g., city name, coordinates)
     * @returns {string} Cache key
     */
    getCacheKey(type, identifier) {
        return `${type}_${identifier.toString().toLowerCase()}`;
    }

    /**
     * Check if cached data is still valid
     * @param {Object} cacheEntry - Cache entry to validate
     * @returns {boolean} True if cache is valid
     */
    isCacheValid(cacheEntry) {
        return cacheEntry && 
               cacheEntry.timestamp && 
               (Date.now() - cacheEntry.timestamp < this.CACHE_DURATION);
    }

    /**
     * Get data from cache if valid
     * @param {string} key - Cache key
     * @returns {Object|null} Cached data or null if invalid/missing
     */
    getCachedData(key) {
        const cacheEntry = this.cache.get(key);
        
        if (this.isCacheValid(cacheEntry)) {
            this.cacheHits++;
            return cacheEntry.data;
        }
        
        // Remove invalid entry from cache
        if (cacheEntry) {
            this.cache.delete(key);
        }
        
        this.cacheMisses++;
        return null;
    }

    /**
     * Store data in cache with timestamp
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     */
    setCachedData(key, data) {
        // Check cache size and clean if necessary
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            this.evictOldestCacheEntry();
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clean expired items from cache
     */
    cleanCache() {
        const now = Date.now();
        let expiredCount = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.CACHE_DURATION) {
                this.cache.delete(key);
                expiredCount++;
            }
        }
        
        if (expiredCount > 0) {
            console.log(`🧹 Cleaned ${expiredCount} expired cache entries`);
        }
    }

    /**
     * Remove oldest item from cache when size limit reached
     */
    evictOldestCacheEntry() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        // Find oldest entry
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }
        
        // Remove oldest entry
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    // ===== API REQUEST HANDLING =====
    
    /**
     * Make API request with enhanced error handling
     * @param {string} url - API endpoint URL
     * @returns {Promise<Object>} API response data
     */
    async makeRequest(url) {
        try {
            // Apply rate limiting
            this.checkRateLimit();
            
            // Validate URL for security
            this.validateUrl(url);
            
            // Log sanitized URL (hide API key)
            const sanitizedUrl = url.replace(/appid=[^&]+/, 'appid=***');
            console.log('🔄 API request:', sanitizedUrl);
            
            // Check API key validity for direct OpenWeatherMap requests
            if (url.includes('openweathermap.org')) {
                if (!this.API_KEY || this.API_KEY === 'YOUR_API_KEY_HERE') {
                    throw new Error('API Key missing or invalid! Please update the API key in js/config.js');
                }
            }
            
            // Set up request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);
            
            // Make the request
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'WeatherDashboard/1.1'
                },
                signal: controller.signal
            });
            
            // Clear timeout
            clearTimeout(timeoutId);
            
            // Handle error responses
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // Special handling for common errors
                if (response.status === 401) {
                    throw new Error('Authentication failed: Invalid API key. Please update your API key in js/config.js');
                } else if (response.status === 404) {
                    throw new Error('Location not found. Please check the city name and try again.');
                } else if (response.status === 429) {
                    throw new Error('API rate limit exceeded. Please try again later.');
                }
                
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            // Verify we received JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format. Expected JSON.');
            }
            
            // Parse and return data
            const data = await response.json();
            return data;
            
        } catch (error) {
            // Handle specific error types
            if (error.name === 'AbortError') {
                console.error('⏱️ API request timed out');
                throw new Error('Request timed out. Please check your connection and try again.');
            }
            
            // Log and rethrow with better message
            console.error('❌ API request failed:', error.message);
            throw new Error(`Weather data request failed: ${error.message}`);
        }
    }

    // ===== WEATHER DATA METHODS =====

    /**
     * Get current weather for a city
     * @param {string} city - City name
     * @returns {Promise<Object>} Current weather data
     */
    async getCurrentWeather(city) {
        // Try to get from cache first
        const cacheKey = this.getCacheKey('current', city);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('📦 Using cached weather data for:', city);
            return cachedData;
        }

        // Build URL based on environment
        let url;
        if (this.BASE_URL.includes('openweathermap.org')) {
            url = `${this.BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${this.API_KEY}&units=metric`;
        } else {
            url = `${this.BASE_URL}/weather?city=${encodeURIComponent(city)}`;
        }
        
        // Make request and cache result
        const data = await this.makeRequest(url);
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get current weather by coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Current weather data
     */
    async getCurrentWeatherByCoords(lat, lon) {
        // Validate coordinates
        if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            throw new Error('Invalid coordinates');
        }
        
        // Try to get from cache first
        const cacheKey = this.getCacheKey('current', `${lat},${lon}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('📦 Using cached weather data for coordinates:', lat, lon);
            return cachedData;
        }

        // Build URL based on environment
        let url;
        if (this.BASE_URL.includes('openweathermap.org')) {
            url = `${this.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;
        } else {
            url = `${this.BASE_URL}/weather?lat=${lat}&lon=${lon}`;
        }
        
        // Make request and cache result
        const data = await this.makeRequest(url);
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get 5-day forecast for a city
     * @param {string} city - City name
     * @returns {Promise<Object>} Forecast data
     */
    async getForecast(city) {
        // Try to get from cache first
        const cacheKey = this.getCacheKey('forecast', city);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('📦 Using cached forecast data for:', city);
            return cachedData;
        }

        // Build URL based on environment
        let url;
        if (this.BASE_URL.includes('openweathermap.org')) {
            url = `${this.BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${this.API_KEY}&units=metric`;
        } else {
            url = `${this.BASE_URL}/forecast?city=${encodeURIComponent(city)}`;
        }
        
        // Make request and cache result
        const data = await this.makeRequest(url);
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get 5-day forecast by coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Forecast data
     */
    async getForecastByCoords(lat, lon) {
        // Validate coordinates
        if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            throw new Error('Invalid coordinates');
        }
        
        // Try to get from cache first
        const cacheKey = this.getCacheKey('forecast', `${lat},${lon}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            console.log('📦 Using cached forecast data for coordinates:', lat, lon);
            return cachedData;
        }

        // Build URL based on environment
        let url;
        if (this.BASE_URL.includes('openweathermap.org')) {
            url = `${this.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=metric`;
        } else {
            url = `${this.BASE_URL}/forecast?lat=${lat}&lon=${lon}`;
        }
        
        // Make request and cache result
        const data = await this.makeRequest(url);
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get UV index data using estimates since One Call API requires subscription
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} UV index and additional data
     */
    async getUVIndex(lat, lon) {
        // Try to get from cache first
        const cacheKey = this.getCacheKey('uv', `${lat},${lon}`);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            return cachedData;
        }

        // We'll skip the OneCall API attempts since your key doesn't have access
        // and go straight to the estimated UV calculation which works well
        console.log('ℹ️ Using estimated UV index (One Call API requires subscription)');
        
        // Calculate estimated UV based on location and time
        const estimatedUV = this.estimateUVIndex(lat, lon);
        const simulatedData = {
            current: { uvi: estimatedUV },
            simulated: true
        };
        
        // Cache the estimated data
        this.setCachedData(cacheKey, simulatedData);
        return simulatedData;
    }

    /**
     * Get complete weather data (current, forecast, and UV index)
     * @param {Object} location - Location object with city name or coordinates
     * @returns {Promise<Object>} Complete weather data
     */
    async getCompleteWeatherData(location) {
        try {
            // Validate location input
            if (!location || ((!location.city) && (!location.lat || !location.lon))) {
                throw new Error('Invalid location. Please provide city or coordinates.');
            }

            // Get current weather based on available location info
            let currentWeather;
            if (location.city) {
                currentWeather = await this.getCurrentWeather(location.city);
            } else {
                currentWeather = await this.getCurrentWeatherByCoords(location.lat, location.lon);
            }

            // Extract coordinates from current weather for forecast and UV
            const lat = currentWeather.coord.lat;
            const lon = currentWeather.coord.lon;

            // Get forecast and UV data in parallel
            const [forecast, uvData] = await Promise.all([
                this.getForecastByCoords(lat, lon),
                this.getUVIndex(lat, lon).catch(err => {
                    console.warn('UV data unavailable:', err.message);
                    return { current: { uvi: null } };
                })
            ]);

            // Combine all data
            return {
                current: currentWeather,
                forecast: forecast,
                uvi: uvData.current?.uvi ?? null,
                location: {
                    name: currentWeather.name,
                    country: currentWeather.sys?.country,
                    lat,
                    lon
                }
            };
        } catch (error) {
            console.error('Error getting complete weather data:', error.message);
            throw error;
        }
    }

    /**
     * Search for cities by name with autocomplete
     * @param {string} query - Search query
     * @param {number} limit - Maximum results
     * @returns {Promise<Array>} List of matching cities
     */
    async searchCities(query, limit = 5) {
        // Validate and clean query
        const cleanQuery = query.trim();
        if (!cleanQuery || cleanQuery.length < 2) {
            return [];
        }
        
        // Implement debouncing for autocomplete
        const now = Date.now();
        if (cleanQuery === this.lastSearchQuery && now - this.lastSearchTime < 2000) {
            return this.lastSearchResults;
        }
        
        // Try cache first
        const cacheKey = this.getCacheKey('cities', cleanQuery);
        const cachedData = this.getCachedData(cacheKey);
        
        if (cachedData) {
            this.lastSearchQuery = cleanQuery;
            this.lastSearchTime = now;
            this.lastSearchResults = cachedData;
            return cachedData;
        }
        
        try {
            let url;
            // Use direct API or proxy based on environment
            if (this.GEOCODING_URL.includes('openweathermap.org')) {
                url = `${this.GEOCODING_URL}/direct?q=${encodeURIComponent(cleanQuery)}&limit=${limit}&appid=${this.API_KEY}`;
            } else {
                url = `${this.GEOCODING_URL}/geocoding?q=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
            }
            
            // Fetch city data
            const data = await this.makeRequest(url);
            
            // Format city results
            const cities = data.map(city => ({
                name: city.name,
                country: city.country,
                state: city.state,
                lat: city.lat,
                lon: city.lon,
                display: `${city.name}${city.state ? `, ${city.state}` : ''}, ${city.country}`
            }));
            
            // Cache, save last results, and return
            this.setCachedData(cacheKey, cities);
            this.lastSearchQuery = cleanQuery;
            this.lastSearchTime = now;
            this.lastSearchResults = cities;
            
            return cities;
        } catch (error) {
            console.error('City search failed:', error.message);
            return [];
        }
    }

    // ===== UTILITY METHODS =====
    
    /**
     * Parse UV value from various API response formats
     * @param {*} uvData - UV data from API
     * @returns {number} Normalized UV index value
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
        
        return 0; // Safe fallback
    }

    /**
     * Estimate UV index based on time, location and season
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {number} Estimated UV index (0-11)
     */
    estimateUVIndex(lat, lon) {
        // Get current date and time
        const date = new Date();
        const hour = date.getHours();
        const month = date.getMonth(); // 0-11
        
        // Calculate absolute latitude (distance from equator)
        const absLat = Math.abs(lat);
        
        // Night time (before 6AM or after 6PM) - minimal UV
        if (hour < 6 || hour > 18) {
            return 0;
        }
        
        // Base UV intensity by time of day (peak at noon)
        let baseUV = 10 - Math.abs(hour - 12) * 1.5;
        
        // Adjust for latitude (higher UV near equator)
        baseUV *= Math.max(0.3, 1 - (absLat / 90) * 0.5);
        
        // Adjust for season (higher in summer)
        const isNorthernHemi = lat >= 0;
        const summerPeak = isNorthernHemi ? 6 : 0; // June in North, December in South
        const winterPeak = isNorthernHemi ? 0 : 6; // December in North, June in South
        
        // Calculate months from winter (0-6)
        const monthsFromWinter = Math.min(Math.abs(month - winterPeak), 12 - Math.abs(month - winterPeak));
        
        // Season factor (0.5 in winter, 1.0 in summer)
        const seasonFactor = 0.5 + (monthsFromWinter / 6) * 0.5;
        baseUV *= seasonFactor;
        
        // Final adjustments and clamping
        return Math.max(0, Math.min(11, Math.round(baseUV)));
    }

    /**
     * Calculate visibility in km from weather data
     * @param {Object} weatherData - Weather data object
     * @returns {number} Visibility in kilometers
     */
    calculateVisibility(weatherData) {
        if (!weatherData || !weatherData.visibility) {
            return null;
        }
        
        // Convert meters to kilometers with 1 decimal place
        return Math.round(weatherData.visibility / 100) / 10;
    }

    /**
     * Apply rate limiting to prevent API abuse
     * @throws {Error} If rate limit is exceeded
     */
    checkRateLimit() {
        const now = Date.now();
        const oneMinute = 60 * 1000;
        
        // Reset counter after window expires
        if (now - this.requestWindow > oneMinute) {
            this.requestCount = 0;
            this.requestWindow = now;
        }
        
        // Check if rate limit reached
        if (this.requestCount >= this.maxRequestsPerMinute) {
            throw new Error('API rate limit reached. Please try again later.');
        }
        
        // Increment counter
        this.requestCount++;
    }

    /**
     * Validate URL for security purposes
     * @param {string} url - URL to validate
     * @throws {Error} If URL is invalid
     */
    validateUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const allowedHosts = [
                'localhost',
                '127.0.0.1',
                'api.openweathermap.org',
                'openweathermap.org',
                window.location.hostname
            ];
            
            // Check if hostname is allowed
            if (!allowedHosts.some(host => parsedUrl.hostname === host || 
                                  parsedUrl.hostname.endsWith('.' + host))) {
                throw new Error('Invalid API URL hostname');
            }
            
            // Check for suspicious patterns
            const suspiciousPatterns = ['../', '..%2f', 'file:', 'data:'];
            if (suspiciousPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
                throw new Error('Potentially unsafe URL detected');
            }
        } catch (error) {
            // Allow relative URLs (for API proxy)
            if (!url.startsWith('/')) {
                throw new Error('Invalid URL format');
            }
        }
    }
}

// Create and export instance
const weatherAPI = new WeatherAPI();

// For module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = weatherAPI;
}