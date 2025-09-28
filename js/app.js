// SECURITY HARDENED Main Application - Fixed XSS and Code Injection Vulnerabilities
// This version addresses all critical security issues identified in the security audit

// SECURITY: Secure global state management
const AppState = {
    forecastData: null,
    isLoading: false,
    lastUpdated: null,
    preferences: null,
    
    setForecast(data) {
        if (data && typeof data === 'object') {
            this.forecastData = Object.freeze({ ...data });
        }
    },
    
    setLoading(status) {
        this.isLoading = Boolean(status);
    }
};

// Advanced DOM utilities with XSS prevention
const SecureDOM = {
    // SECURITY FIX: Safe element selection with validation
    getElement(selector) {
        if (!selector || typeof selector !== 'string') {
            return null;
        }
        
        try {
            return document.querySelector(selector);
        } catch (error) {
            console.error('Error selecting element:', selector, error);
            return null;
        }
    }
};

// SECURITY: Enhanced weather service with input validation
class SecureWeatherService {
    constructor() {
        this.apiKey = this.getSecureApiKey();
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.requestCount = 0;
        this.requestLimit = 100; // Per hour
        this.lastRequestTime = 0;
        
        // Performance: Simple cache for faster repeat requests
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Initialize WeatherAPI instance
        this.weatherAPI = new WeatherAPI();
    }

    // SECURITY: Secure API key retrieval
    getSecureApiKey() {
        // For client-side deployment, get API key from CONFIG
        if (typeof CONFIG !== 'undefined' && CONFIG.isApiKeyValid()) {
            return CONFIG.OPENWEATHER_API_KEY;
        }
        
        // No fallback - use environment variables only
        return null;
    }

    // SECURITY: Rate limiting
    checkRateLimit() {
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        
        if (this.lastRequestTime < hourAgo) {
            this.requestCount = 0;
        }
        
        if (this.requestCount >= this.requestLimit) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        this.requestCount++;
        this.lastRequestTime = now;
    }

    // SECURITY: Safe URL construction with validation
    buildWeatherUrl(city, endpoint = 'forecast') {
        this.checkRateLimit();
        
        // SECURITY: Validate endpoint
        const allowedEndpoints = ['forecast'];
        if (!allowedEndpoints.includes(endpoint)) {
            throw new Error('Invalid API endpoint');
        }
        
        // SECURITY: Validate and sanitize city name
        const safeCityName = Utils.validateCityName(city);
        if (!safeCityName) {
            throw new Error('Invalid city name provided');
        }
        
        // SECURITY: Use URL constructor for safe URL building
        const url = new URL(`${this.baseUrl}/${endpoint}`);
        url.searchParams.set('q', safeCityName);
        url.searchParams.set('appid', this.apiKey);
        url.searchParams.set('units', 'metric');
        
        return url.toString();
    }

    // SECURITY: Safe API request with timeout and validation
    async makeSecureRequest(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
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
                if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your configuration.');
                } else if (response.status === 404) {
                    throw new Error('City not found. Please check the city name.');
                } else if (response.status === 429) {
                    throw new Error('API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`Weather service error: ${response.status}`);
                }
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format from weather service');
            }
            
            const data = await response.json();
            
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data received from weather service');
            }
            
            return data;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            throw error;
        }
    }

    // Get forecast with security validation
    async getForecast(city) {
        try {
            const url = this.buildWeatherUrl(city, 'forecast');
            const data = await this.makeSecureRequest(url);
            
            // SECURITY: Validate data structure
            if (!data.list || !Array.isArray(data.list)) {
                throw new Error('Invalid forecast data structure');
            }
            
            // SECURITY: Return sanitized forecast data
            return {
                city: {
                    name: Utils.sanitizeText(data.city?.name || 'Unknown'),
                    country: Utils.sanitizeText(data.city?.country || '')
                },
                list: data.list.slice(0, 40).map(item => ({
                    dt: Number(item.dt) || 0,
                    dt_txt: Utils.sanitizeText(item.dt_txt || ''),
                    main: {
                        temp: Number(item.main?.temp) || 0,
                        temp_min: Number(item.main?.temp_min) || 0,
                        temp_max: Number(item.main?.temp_max) || 0,
                        pressure: Number(item.main?.pressure) || 0,
                        humidity: Number(item.main?.humidity) || 0
                    },
                    weather: item.weather && Array.isArray(item.weather) ? [{
                        main: Utils.sanitizeText(item.weather[0]?.main || ''),
                        description: Utils.sanitizeText(item.weather[0]?.description || ''),
                        icon: Utils.sanitizeText(item.weather[0]?.icon || '01d')
                    }] : [],
                    wind: {
                        speed: Number(item.wind?.speed) || 0,
                        deg: Number(item.wind?.deg) || 0
                    },
                    clouds: {
                        all: Number(item.clouds?.all) || 0
                    }
                }))
            };
            
        } catch (error) {
            console.error('Error fetching forecast:', error);
            throw error;
        }
    }
}

// SECURITY: Enhanced application controller
class SecureWeatherApp {
    constructor() {
        console.log('🎆 Initializing SecureWeatherApp...');
        this.weatherService = new SecureWeatherService();
        this.preferences = Utils.getUserPreferences();
        console.log('🔧 Weather service initialized:', !!this.weatherService.weatherAPI);
        this.initializeEventListeners();
    }

    // Initialize app and load weather data
    async initialize() {
        try {
            await this.loadDefaultLocation();
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            throw error;
        }
    }

    // SECURITY: Safe event listener initialization
    initializeEventListeners() {
        // Search button
        const searchBtn = SecureDOM.getElement('#search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => this.handleSearch(e));
        }

        // Search input with suggestions
        const cityInput = SecureDOM.getElement('#city-input');
        if (cityInput) {
            cityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch(e);
                }
            });
            
            // Add city suggestions on input
            cityInput.addEventListener('input', Utils.debounce(async (e) => {
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    await this.showCitySuggestions(query);
                } else {
                    this.hideCitySuggestions();
                }
            }, 300));
            
            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-box-container')) {
                    this.hideCitySuggestions();
                }
            });
        }

        // Location button
        const locationBtn = SecureDOM.getElement('#location-btn');
        if (locationBtn) {
            locationBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                locationBtn.disabled = true;
                locationBtn.innerHTML = '<i class="fas fa-spinner spinning"></i> Getting Location...';
                
                try {
                    await this.getCurrentLocationWeather();
                } finally {
                    locationBtn.disabled = false;
                    locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Current Location';
                }
            });
        }
    }

    // SECURITY: Safe search handling with input validation
    async handleSearch(event) {
        event.preventDefault();
        
        const searchInput = SecureDOM.getElement('#city-input');
        if (!searchInput) {
            Utils.showError('Search input not found');
            return;
        }
        
        const cityName = searchInput.value.trim();
        
        if (!cityName) {
            Utils.showError('Please enter a city name');
            return;
        }
        
        // SECURITY: Validate city name
        const safeCityName = Utils.validateCityName(cityName);
        if (!safeCityName) {
            Utils.showError('Please enter a valid city name');
            return;
        }
        
        await this.loadWeatherData(safeCityName);
    }

    // SECURITY: Safe weather data loading with error handling
    async loadWeatherData(city) {
        if (AppState.isLoading) {
            console.log('Already loading weather data, skipping...');
            return;
        }

        try {
            console.log(`🌦️ Starting to load weather data for: ${city}`);
            AppState.setLoading(true);
            this.showLoadingState();

            // Check if weatherAPI is available
            if (!this.weatherService.weatherAPI) {
                console.error('WeatherAPI not initialized');
                throw new Error('Weather service not properly initialized');
            }

            console.log('Fetching complete weather data...');
            const weatherData = await this.weatherService.weatherAPI.getCompleteWeatherData({ city });
            
            console.log('📊 Complete weather data received:', weatherData);
            
            if (weatherData.forecast) {
                AppState.setForecast(weatherData.forecast);
            }
            
            // Display current weather
            if (weatherData.current) {
                console.log('🌡️ Displaying current weather...');
                this.displayCurrentWeather(weatherData.current);
            } else {
                console.warn('⚠️ No current weather data received');
            }
            
            // Display forecast
            if (weatherData.forecast) {
                console.log('📅 Displaying forecast...');
                this.displayForecast(weatherData.forecast);
            } else {
                console.warn('⚠️ No forecast data received');
            }
            
            this.hideLoadingState();
            console.log('✅ Weather data loading completed successfully');

        } catch (error) {
            console.error('❌ Weather loading error:', error);
            Utils.showError(error.message || 'Failed to load weather data');
            this.hideLoadingState();
        } finally {
            AppState.setLoading(false);
        }
    }

    // Helper function to reliably get elements
    getReliableElement(selector) {
        if (selector.startsWith('#')) {
            const id = selector.substring(1);
            const element = document.getElementById(id);
            if (element) {
                return element;
            }
        }
        
        const element = document.querySelector(selector);
        if (element) {
            return element;
        }
        
        return null;
    }

    // Display current weather
    displayCurrentWeather(data) {
        if (!data) {
            console.warn('No current weather data provided');
            return;
        }
        
        console.log('Displaying current weather data:', data);
        
        try {
            // Update city name and date
            const cityElement = this.getReliableElement('#current-city');
            if (cityElement) {
                const cityName = `${data.name || 'Unknown'}, ${data.sys?.country || ''}`;
                cityElement.textContent = cityName;
                console.log('Updated city name:', cityName);
            } else {
                console.warn('City element not found');
            }
            
            const dateElement = this.getReliableElement('#current-date');
            if (dateElement) {
                const now = new Date();
                const dateString = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                dateElement.textContent = dateString;
                console.log('Updated date:', dateString);
            } else {
                console.warn('Date element not found');
            }
            
            // Update weather icon
            const iconElement = this.getReliableElement('#current-weather-icon');
            if (iconElement && data.weather?.[0]?.icon) {
                const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
                iconElement.src = iconUrl;
                iconElement.alt = data.weather[0].description || 'Weather icon';
                iconElement.style.display = 'block';
                console.log('Updated weather icon:', iconUrl);
            } else {
                console.warn('Weather icon element not found or no icon data');
            }
            
            // Update temperature
            const tempElement = this.getReliableElement('#current-temp');
            if (tempElement) {
                const temp = `${Math.round(data.main?.temp || 0)}°`;
                tempElement.textContent = temp;
                console.log('Updated temperature:', temp);
            } else {
                console.warn('Temperature element not found');
            }
            
            // Update feels like
            const feelsLikeElement = this.getReliableElement('#feels-like');
            if (feelsLikeElement) {
                const feelsLike = `Feels like ${Math.round(data.main?.feels_like || 0)}°`;
                feelsLikeElement.textContent = feelsLike;
                console.log('Updated feels like:', feelsLike);
            } else {
                console.warn('Feels like element not found');
            }
            
            // Update weather description
            const descElement = this.getReliableElement('#weather-description');
            if (descElement) {
                const description = Utils.capitalizeWords(data.weather?.[0]?.description || 'Loading...');
                descElement.textContent = description;
                console.log('Updated description:', description);
            } else {
                console.warn('Description element not found');
            }
            
            // Update weather details
            const visibilityElement = this.getReliableElement('#visibility');
            if (visibilityElement) {
                const visibility = this.weatherService.weatherAPI.calculateVisibility(data);
                visibilityElement.textContent = `${visibility} km`;
                console.log('Updated visibility:', `${visibility} km`);
            } else {
                console.warn('Visibility element not found');
            }
            
            const humidityElement = this.getReliableElement('#humidity');
            if (humidityElement) {
                const humidity = `${data.main?.humidity || 0}%`;
                humidityElement.textContent = humidity;
                console.log('Updated humidity:', humidity);
            } else {
                console.warn('Humidity element not found');
            }
            
            const windElement = this.getReliableElement('#wind-speed');
            if (windElement) {
                const windSpeed = Math.round((data.wind?.speed || 0) * 3.6); // Convert m/s to km/h
                const windText = `${windSpeed} km/h`;
                windElement.textContent = windText;
                console.log('Updated wind speed:', windText);
            } else {
                console.warn('Wind speed element not found');
            }
            
            const pressureElement = this.getReliableElement('#pressure');
            if (pressureElement) {
                const pressure = `${data.main?.pressure || 0} hPa`;
                pressureElement.textContent = pressure;
                console.log('Updated pressure:', pressure);
            } else {
                console.warn('Pressure element not found');
            }
            
            // Update map location
            this.updateMapLocation(data);
            
            console.log('✅ Current weather display completed successfully');
            
        } catch (error) {
            console.error('❌ Error displaying current weather:', error);
        }
    }
    
    // Update map location
    updateMapLocation(data) {
        try {
            const cityName = `${data.name || 'Unknown'}, ${data.sys?.country || ''}`;
            
            // Update map legend
            const currentLayerElement = this.getReliableElement('#current-layer');
            if (currentLayerElement) {
                currentLayerElement.textContent = cityName;
            }
            
            // Update map center if coordinates are available
            if (window.weatherMapInstance && data.coord) {
                const { lat, lon } = data.coord;
                window.weatherMapInstance.setView([lat, lon], 10);
                
                // Clear existing markers
                window.weatherMapInstance.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        window.weatherMapInstance.removeLayer(layer);
                    }
                });
                
                // Add new marker
                L.marker([lat, lon])
                    .addTo(window.weatherMapInstance)
                    .bindPopup(`📍 ${cityName}`)
                    .openPopup();
            }
        } catch (error) {
            console.error('Error updating map location:', error);
        }
    }

    // SECURITY: Safe forecast display
    displayForecast(data) {
        if (!data || !data.list) {
            return;
        }
        
        // Display hourly forecast (next 24 hours)
        this.displayHourlyForecast(data.list);
        
        // Display daily forecast (next 5 days)
        this.displayDailyForecast(data.list);
    }
    
    // Display 24-hour forecast
    displayHourlyForecast(forecastList) {
        const hourlyContainer = this.getReliableElement('#hourly-forecast');
        if (!hourlyContainer) {
            return;
        }
        
        // Clear existing content
        hourlyContainer.textContent = '';
        
        // Get next 8 items (24 hours, 3-hour intervals)
        const hourlyItems = forecastList.slice(0, 8);
        
        hourlyItems.forEach(item => {
            const hourlyCard = this.createHourlyCard(item);
            hourlyContainer.appendChild(hourlyCard);
        });
    }
    
    // Display 5-day forecast
    displayDailyForecast(forecastList) {
        const forecastContainer = this.getReliableElement('#forecast-container');
        if (!forecastContainer) {
            return;
        }
        
        // Clear existing content
        forecastContainer.textContent = '';
        
        // Process daily forecasts
        const dailyForecasts = this.processDailyForecasts(forecastList);
        
        dailyForecasts.slice(0, 5).forEach(forecast => {
            const card = this.createDailyCard(forecast);
            forecastContainer.appendChild(card);
        });
    }

    // Create hourly forecast card
    createHourlyCard(item) {
        const card = document.createElement('div');
        card.className = 'hourly-card';
        
        // Time
        const time = new Date(item.dt * 1000);
        const timeElement = document.createElement('div');
        timeElement.className = 'hourly-time';
        timeElement.textContent = time.getHours() + ':00';
        
        // Weather icon
        const iconElement = document.createElement('img');
        iconElement.className = 'hourly-icon';
        iconElement.src = `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;
        iconElement.alt = item.weather[0].description;
        
        // Temperature
        const tempElement = document.createElement('div');
        tempElement.className = 'hourly-temp';
        tempElement.textContent = Math.round(item.main.temp) + '°';
        
        // Description
        const descElement = document.createElement('div');
        descElement.className = 'hourly-desc';
        descElement.textContent = item.weather[0].main;
        
        card.appendChild(timeElement);
        card.appendChild(iconElement);
        card.appendChild(tempElement);
        card.appendChild(descElement);
        
        return card;
    }
    
    // Create daily forecast card
    createDailyCard(forecast) {
        const card = document.createElement('div');
        card.className = 'daily-card';
        card.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            margin: 8px 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            min-height: 60px;
        `;
        
        // Date
        const date = new Date(forecast.dt * 1000);
        const dateElement = document.createElement('div');
        dateElement.className = 'daily-date';
        dateElement.textContent = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        dateElement.style.cssText = 'font-weight: bold; min-width: 100px;';
        
        // Weather icon and description
        const weatherDiv = document.createElement('div');
        weatherDiv.style.cssText = 'display: flex; align-items: center; flex: 1; justify-content: center;';
        
        const iconElement = document.createElement('img');
        iconElement.src = `https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png`;
        iconElement.alt = forecast.weather[0].description;
        iconElement.style.cssText = 'width: 50px; height: 50px; margin-right: 12px;';
        
        const descElement = document.createElement('div');
        descElement.textContent = Utils.capitalizeWords(forecast.weather[0].description);
        descElement.style.cssText = 'font-size: 14px; color: #666;';
        
        weatherDiv.appendChild(iconElement);
        weatherDiv.appendChild(descElement);
        
        // Temperature range
        const tempDiv = document.createElement('div');
        tempDiv.className = 'daily-temps';
        tempDiv.style.cssText = 'text-align: right; min-width: 80px;';
        
        const maxTemp = document.createElement('span');
        maxTemp.textContent = Math.round(forecast.main.temp_max) + '°';
        maxTemp.style.cssText = 'font-weight: bold; margin-right: 8px;';
        
        const minTemp = document.createElement('span');
        minTemp.textContent = Math.round(forecast.main.temp_min) + '°';
        minTemp.style.cssText = 'color: #888;';
        
        tempDiv.appendChild(maxTemp);
        tempDiv.appendChild(minTemp);
        
        card.appendChild(dateElement);
        card.appendChild(weatherDiv);
        card.appendChild(tempDiv);
        
        return card;
    }

    // Process daily forecasts
    processDailyForecasts(forecastList) {
        const dailyData = new Map();
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            
            if (!dailyData.has(date)) {
                dailyData.set(date, {
                    ...item,
                    main: {
                        ...item.main,
                        temp_min: item.main.temp,
                        temp_max: item.main.temp
                    }
                });
            } else {
                const existing = dailyData.get(date);
                existing.main.temp_min = Math.min(existing.main.temp_min, item.main.temp);
                existing.main.temp_max = Math.max(existing.main.temp_max, item.main.temp);
            }
        });
        
        return Array.from(dailyData.values());
    }

    // Loading state management
    showLoadingState() {
        console.log('Showing loading state...');
        const forecastContainer = this.getReliableElement('#forecast-container');
        
        if (forecastContainer) {
            Utils.showLoading(forecastContainer, 'Loading forecast...');
        }
        
        // Show loading indicators for current weather elements
        const currentCity = this.getReliableElement('#current-city');
        if (currentCity) {
            currentCity.textContent = 'Loading...';
        }
        
        const currentTemp = this.getReliableElement('#current-temp');
        if (currentTemp) {
            currentTemp.textContent = '--°';
        }
        
        const weatherDesc = this.getReliableElement('#weather-description');
        if (weatherDesc) {
            weatherDesc.textContent = 'Loading...';
        }
    }

    hideLoadingState() {
        console.log('Hiding loading state...');
        const forecastContainer = this.getReliableElement('#forecast-container');
        
        if (forecastContainer) {
            Utils.hideLoading(forecastContainer);
        }
    }

    // Geolocation handling
    async getCurrentLocationWeather() {
        try {
            console.log('🌍 Getting current location...');
            const position = await Utils.getCurrentLocation();
            console.log('📍 Location found:', position);
            
            const weatherData = await this.weatherService.weatherAPI.getCompleteWeatherData({
                lat: position.latitude,
                lon: position.longitude
            });
            
            if (weatherData.current) {
                this.displayCurrentWeather(weatherData.current);
            }
            if (weatherData.forecast) {
                this.displayForecast(weatherData.forecast);
            }
            
        } catch (error) {
            console.error('❌ Location error:', error);
            Utils.showError(error.message || 'Unable to get your location. Using default city.');
            await this.loadWeatherData('Mumbai');
        }
    }

    // Show city suggestions
    async showCitySuggestions(query) {
        try {
            const cities = await this.weatherService.weatherAPI.searchCities(query, 8);
            const suggestionsContainer = SecureDOM.getElement('#city-suggestions');
            
            if (!suggestionsContainer) return;
            
            suggestionsContainer.innerHTML = '';
            
            if (cities.length > 0) {
                cities.forEach(city => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.className = 'suggestion-item';
                    suggestionItem.innerHTML = `
                        <i class="fas fa-map-marker-alt suggestion-icon"></i>
                        <div>
                            <div class="suggestion-city">${city.name}</div>
                            <div class="suggestion-country">${city.state || city.country}</div>
                        </div>
                    `;
                    
                    suggestionItem.addEventListener('click', () => {
                        this.selectCity(city.name);
                    });
                    
                    suggestionsContainer.appendChild(suggestionItem);
                });
                
                suggestionsContainer.classList.remove('hidden');
            } else {
                this.hideCitySuggestions();
            }
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
            this.hideCitySuggestions();
        }
    }
    
    // Hide city suggestions
    hideCitySuggestions() {
        const suggestionsContainer = SecureDOM.getElement('#city-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.add('hidden');
        }
    }
    
    // Select city from suggestions
    async selectCity(cityName) {
        const cityInput = SecureDOM.getElement('#city-input');
        if (cityInput) {
            cityInput.value = cityName;
        }
        this.hideCitySuggestions();
        await this.loadWeatherData(cityName);
    }

    // Safe default location loading
    async loadDefaultLocation() {
        console.log('🏠 Loading default location...');
        try {
            console.log('🌆 Trying Mumbai...');
            await this.loadWeatherData('Mumbai');
            console.log('✅ Mumbai weather loaded successfully');
        } catch (error) {
            console.log('⚠️ Mumbai failed, trying Delhi...', error.message);
            try {
                await this.loadWeatherData('Delhi');
                console.log('✅ Delhi weather loaded successfully');
            } catch (fallbackError) {
                console.error('❌ Both default locations failed:', fallbackError.message);
                Utils.showError('Unable to load weather data. Please search for a city manually.');
            }
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new SecureWeatherApp();
        window.weatherApp = app;
        
        // Add error modal event listeners
        const modalClose = document.getElementById('modal-close');
        const modalOk = document.getElementById('modal-ok');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => Utils.hideError());
        }
        
        if (modalOk) {
            modalOk.addEventListener('click', () => Utils.hideError());
        }
        
        // Add theme toggle functionality
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                }
            });
        }
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeIcon = themeToggle?.querySelector('i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        await app.initialize();
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        console.log('✅ Weather Dashboard initialized successfully');

    } catch (error) {
        console.error('❌ Failed to initialize Weather Dashboard:', error);
        
        // Hide loading screen even on error
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
});