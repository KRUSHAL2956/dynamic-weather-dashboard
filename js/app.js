// Main Application JavaScript for Dynamic Weather Dashboard

/**
 * Main Weather Dashboard Application
 */
class WeatherDashboard {
    constructor() {
        this.currentLocation = null;
        this.weatherData = null;
        this.userPreferences = Utils.getUserPreferences();
        this.lastUpdateTime = null;
        
        // DOM Elements
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            cityInput: document.getElementById('city-input'),
            searchBtn: document.getElementById('search-btn'),
            locationBtn: document.getElementById('location-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            
            // Current weather elements
            cityName: document.getElementById('city-name'),
            dateTime: document.getElementById('date-time'),
            weatherIcon: document.getElementById('weather-icon'),
            tempValue: document.getElementById('temp-value'),
            weatherDescription: document.getElementById('weather-description'),
            feelsLike: document.getElementById('feels-like'),
            
            // Weather details
            visibility: document.getElementById('visibility'),
            humidity: document.getElementById('humidity'),
            windSpeed: document.getElementById('wind-speed'),
            pressure: document.getElementById('pressure'),
            uvIndex: document.getElementById('uv-index'),
            cloudiness: document.getElementById('cloudiness'),
            
            // Forecast containers
            hourlyForecast: document.getElementById('hourly-forecast'),
            forecastContainer: document.getElementById('forecast-container'),
            
            // Modal elements
            errorModal: document.getElementById('error-modal'),
            modalClose: document.getElementById('modal-close'),
            modalOk: document.getElementById('modal-ok')
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🌟 Initializing Weather Dashboard...');
            this.setupEventListeners();
            this.applyTheme();
            
            // Debug: Check if API key is set
            console.log('🔑 API Key configured:', weatherAPI.isApiKeySet());
            
            // Try to load weather for user's current location
            await this.loadCurrentLocationWeather();
            
        } catch (error) {
            console.error('Initialization error:', error);
            Utils.showError('Failed to initialize the application. Please refresh the page.');
        } finally {
            this.hideLoadingScreen();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        this.elements.searchBtn?.addEventListener('click', () => this.handleSearch());
        this.elements.cityInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Debounced search as user types
        if (this.elements.cityInput) {
            const debouncedSearch = Utils.debounce((value) => {
                if (value.length > 2) {
                    this.suggestCities(value);
                }
            }, 300);

            this.elements.cityInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }

        // Current location button
        this.elements.locationBtn?.addEventListener('click', () => this.handleCurrentLocation());

        // Theme toggle
        this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());

        // Modal close events
        this.elements.modalClose?.addEventListener('click', () => Utils.hideError());
        this.elements.modalOk?.addEventListener('click', () => Utils.hideError());
        this.elements.errorModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.errorModal) {
                Utils.hideError();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Utils.hideError();
            }
        });

        // Window resize handler for responsive updates
        window.addEventListener('resize', Utils.debounce(() => {
            this.updateResponsiveLayout();
        }, 250));
    }

    /**
     * Handle search functionality
     */
    async handleSearch() {
        const cityName = this.elements.cityInput?.value?.trim();
        
        if (!cityName) {
            Utils.showError('Please enter a city name.');
            return;
        }

        const validatedCity = Utils.validateCityName(cityName);
        if (!validatedCity) {
            Utils.showError('Please enter a valid city name.');
            return;
        }

        try {
            // Show loading state
            this.elements.searchBtn.innerHTML = '<i class="fas fa-spinner spinning"></i>';
            this.elements.searchBtn.disabled = true;
            
            await this.loadWeatherByCity(validatedCity);
            this.elements.cityInput.value = '';
            
        } catch (error) {
            console.error('Search error:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to load weather data for the specified city.';
            
            if (error.message.includes('Invalid API key')) {
                errorMessage = 'API key error. Please check the configuration.';
            } else if (error.message.includes('city not found')) {
                errorMessage = `City "${Utils.sanitizeText(validatedCity)}" not found. Please check the spelling and try again.`;
            } else if (error.message.includes('Network error')) {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            Utils.showError(errorMessage);
        } finally {
            // Reset search button
            this.elements.searchBtn.innerHTML = '<i class="fas fa-search"></i>';
            this.elements.searchBtn.disabled = false;
        }
    }

    /**
     * Handle current location functionality
     */
    async handleCurrentLocation() {
        try {
            Utils.showLoading(this.elements.locationBtn, 'Getting location...');
            
            const position = await Utils.getCurrentLocation();
            await this.loadWeatherByCoordinates(position.latitude, position.longitude);
            
        } catch (error) {
            Utils.showError(error.message || 'Failed to get your current location.');
        } finally {
            this.elements.locationBtn.innerHTML = `
                <i class="fas fa-location-dot"></i>
                Current Location
            `;
        }
    }

    /**
     * Load weather for current location on app start
     */
    async loadCurrentLocationWeather() {
        try {
            console.log('🌍 Attempting to load current location weather...');
            if (Utils.supportsGeolocation()) {
                console.log('📍 Geolocation supported, getting position...');
                const position = await Utils.getCurrentLocation();
                console.log('📍 Position received:', position.latitude, position.longitude);
                await this.loadWeatherByCoordinates(position.latitude, position.longitude);
            } else {
                console.log('📍 Geolocation not supported, using fallback city');
                // Fallback to a default city if geolocation is not supported
                await this.loadWeatherByCity('London');
            }
        } catch (error) {
            console.warn('⚠️ Could not load current location weather:', error);
            // Fallback to a default city
            try {
                console.log('🏙️ Trying fallback city: London');
                await this.loadWeatherByCity('London');
            } catch (fallbackError) {
                console.warn('⚠️ Fallback city failed, using demo data:', fallbackError);
                // Use demo data as final fallback
                try {
                    console.log('🎭 Loading demo data...');
                    const demoData = weatherAPI.getDemoWeatherData();
                    this.weatherData = demoData;
                    await this.updateUI(demoData);
                    Utils.showError('Using demo data. Please check your API key configuration.', 10000);
                } catch (demoError) {
                    console.error('❌ Demo data failed:', demoError);
                    Utils.showError('Unable to load weather data. Please check your configuration.');
                }
            }
        }
    }

    /**
     * Load weather data by city name
     * @param {string} cityName - Name of the city
     */
    async loadWeatherByCity(cityName) {
        try {
            console.log(`🏙️ Loading weather for city: ${cityName}`);
            this.showLoadingStates();
            
            const weatherData = await weatherAPI.getCompleteWeatherData({ city: cityName });
            console.log('📊 Weather data received:', weatherData);
            this.weatherData = weatherData;
            this.currentLocation = { city: cityName };
            this.lastUpdateTime = Date.now();
            
            await this.updateUI(weatherData);
            console.log('✅ UI updated successfully');
            
        } catch (error) {
            console.error(`❌ Failed to load weather for ${cityName}:`, error);
            throw new Error(`Unable to load weather for "${Utils.sanitizeText(cityName)}". ${error.message}`);
        } finally {
            this.hideLoadingStates();
        }
    }

    /**
     * Load weather data by coordinates
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    async loadWeatherByCoordinates(lat, lon) {
        try {
            this.showLoadingStates();
            
            const weatherData = await weatherAPI.getCompleteWeatherData({ lat, lon });
            this.weatherData = weatherData;
            this.currentLocation = { lat, lon };
            this.lastUpdateTime = Date.now();
            
            await this.updateUI(weatherData);
            
        } catch (error) {
            throw new Error(`Unable to load weather for your location. ${error.message}`);
        } finally {
            this.hideLoadingStates();
        }
    }

    /**
     * Update UI with weather data
     * @param {Object} weatherData - Complete weather data
     */
    async updateUI(weatherData) {

        
        // Update current weather
        this.updateCurrentWeather(weatherData.current, weatherData.location);
        
        // Update hourly forecast (use forecast data for hourly)
        if (weatherData.forecast && weatherData.forecast.list) {
            this.updateHourlyForecast(weatherData.forecast.list.slice(0, 8)); // First 8 entries for hourly
        }
        
        // Update daily forecast (process forecast data to get daily data)
        if (weatherData.forecast && weatherData.forecast.list) {
            const dailyData = this.processDailyForecast(weatherData.forecast.list);
            this.updateDailyForecast(dailyData);
        }
        
        // Update background based on weather
        this.updateBackground(weatherData.current);
        
        // Animate elements
        this.animateWeatherUpdates();
    }

    /**
     * Update current weather display
     * @param {Object} current - Current weather data
     * @param {Object} location - Location data (optional)
     */
    updateCurrentWeather(current, location = null) {
        // Location and time
        if (this.elements.cityName) {
            let locationName = 'Unknown Location';
            
            if (location && location.name) {
                locationName = `${Utils.sanitizeText(location.name)}${location.country ? `, ${Utils.sanitizeText(location.country)}` : ''}`;
            } else if (current && current.name) {
                locationName = `${Utils.sanitizeText(current.name)}${current.sys?.country ? `, ${Utils.sanitizeText(current.sys.country)}` : ''}`;
            }
            
            this.elements.cityName.textContent = locationName;
        }

        if (this.elements.dateTime) {
            this.elements.dateTime.textContent = Utils.formatDateTime(new Date());
        }

        // Weather icon
        if (this.elements.weatherIcon && current.weather?.[0]?.icon) {
            this.elements.weatherIcon.src = Utils.getWeatherIconUrl(current.weather[0].icon, 'large');
            this.elements.weatherIcon.alt = current.weather[0].description || 'Weather icon';
        }

        // Temperature
        if (this.elements.tempValue) {
            const temp = current.main?.temp;
            this.elements.tempValue.textContent = temp !== undefined ? `${Math.round(temp)}°C` : '--';
        }

        // Weather description
        if (this.elements.weatherDescription) {
            this.elements.weatherDescription.textContent = 
                Utils.capitalizeWords(current.weather?.[0]?.description || '--');
        }

        if (this.elements.feelsLike) {
            this.elements.feelsLike.textContent = 
                current.main?.feels_like ? `${Math.round(current.main.feels_like)}°C` : '--';
        }

        // Weather details
        if (this.elements.visibility) {
            this.elements.visibility.textContent = 
                current.visibility ? Utils.formatVisibility(current.visibility) : '--';
        }

        if (this.elements.humidity) {
            this.elements.humidity.textContent = 
                current.main?.humidity ? `${current.main.humidity}%` : '--%';
        }

        if (this.elements.windSpeed) {
            this.elements.windSpeed.textContent = 
                current.wind?.speed ? `${Utils.convertWindSpeed(current.wind.speed, 'ms', 'kmh')} km/h` : '-- km/h';
        }

        if (this.elements.pressure) {
            this.elements.pressure.textContent = 
                current.main?.pressure ? Utils.formatPressure(current.main.pressure) : '-- hPa';
        }

        if (this.elements.uvIndex) {
            // Note: UV index is not available in basic OpenWeatherMap API
            this.elements.uvIndex.textContent = '--';
        }

        if (this.elements.cloudiness) {
            this.elements.cloudiness.textContent = 
                current.clouds?.all !== undefined ? `${current.clouds.all}%` : '--%';
        }
    }

    /**
     * Process forecast data to create daily forecast
     * @param {Array} forecastList - 5-day forecast list
     * @returns {Array} Daily forecast data
     */
    processDailyForecast(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            
            if (!dailyData[date]) {
                dailyData[date] = {
                    date: item.dt,
                    temps: [],
                    weather: item.weather[0],
                    humidity: item.main.humidity,
                    wind: item.wind
                };
            }
            
            dailyData[date].temps.push(item.main.temp);
        });
        
        return Object.values(dailyData).map(day => ({
            dt: day.date,
            temp: {
                min: Math.min(...day.temps),
                max: Math.max(...day.temps)
            },
            weather: [day.weather],
            humidity: day.humidity,
            wind: day.wind
        })).slice(0, 5); // Limit to 5 days
    }

    /**
     * Update hourly forecast display
     * @param {Array} hourlyData - Hourly forecast data
     */
    updateHourlyForecast(hourlyData) {
        if (!this.elements.hourlyForecast || !hourlyData || !Array.isArray(hourlyData)) {
            return;
        }

        console.log('Updating hourly forecast with data:', hourlyData.slice(0, 2)); // Debug first 2 items

        const hourlyHTML = hourlyData.map(hour => {
            const time = Utils.formatHourlyTime(new Date(hour.dt * 1000));
            const iconUrl = Utils.getWeatherIconUrl(hour.weather?.[0]?.icon || '01d', 'small');
            const description = Utils.sanitizeText(hour.weather?.[0]?.description || 'Weather');
            
            // Handle different API formats - One Call API uses 'temp', basic API uses 'main.temp'
            let temp = '--';
            if (hour.temp !== undefined) {
                temp = Math.round(hour.temp); // One Call API format
            } else if (hour.main?.temp !== undefined) {
                temp = Math.round(hour.main.temp); // Basic API format
            }
            
            return `
                <div class="hourly-item">
                    <div class="hourly-time">${Utils.escapeHtml(time)}</div>
                    <div class="hourly-icon">
                        <img src="${Utils.escapeHtml(iconUrl)}" alt="${Utils.escapeHtml(description)}">
                    </div>
                    <div class="hourly-temp">${Utils.escapeHtml(temp.toString())}°</div>
                </div>
            `;
        }).join('');

        this.elements.hourlyForecast.innerHTML = hourlyHTML;
    }

    /**
     * Update daily forecast display
     * @param {Array} dailyData - Daily forecast data
     */
    updateDailyForecast(dailyData) {
        if (!this.elements.forecastContainer || !dailyData || !Array.isArray(dailyData)) {
            return;
        }

        console.log('Updating daily forecast with data:', dailyData.slice(0, 2)); // Debug first 2 items

        const forecastHTML = dailyData.map(day => {
            const dateInfo = Utils.formatForecastDate(new Date(day.dt * 1000));
            const iconUrl = Utils.getWeatherIconUrl(day.weather?.[0]?.icon || '01d', 'medium');
            const description = Utils.capitalizeWords(Utils.sanitizeText(day.weather?.[0]?.description || 'Weather'));
            
            // Handle different temperature formats
            let maxTemp = '--';
            let minTemp = '--';
            
            if (day.temp?.max !== undefined && day.temp?.min !== undefined) {
                // One Call API format
                maxTemp = Math.round(day.temp.max);
                minTemp = Math.round(day.temp.min);
            } else if (day.main?.temp_max !== undefined && day.main?.temp_min !== undefined) {
                // Basic API format
                maxTemp = Math.round(day.main.temp_max);
                minTemp = Math.round(day.main.temp_min);
            }
            
            const humidity = day.humidity !== undefined ? day.humidity : (day.main?.humidity || '--');
            const windSpeed = day.wind?.speed !== undefined ? Utils.convertWindSpeed(day.wind.speed, 'ms', 'kmh') : '--';
            
            return `
                <div class="forecast-card">
                    <div class="forecast-header">
                        <div>
                            <div class="forecast-day">${Utils.escapeHtml(dateInfo.day)}</div>
                            <div class="forecast-date">${Utils.escapeHtml(dateInfo.date)}</div>
                        </div>
                        <div class="forecast-icon">
                            <img src="${Utils.escapeHtml(iconUrl)}" alt="${Utils.escapeHtml(description)}">
                        </div>
                    </div>
                    <div class="forecast-main">
                        <div class="forecast-temps">
                            <div class="forecast-high">${Utils.escapeHtml(maxTemp.toString())}°</div>
                            <div class="forecast-low">${Utils.escapeHtml(minTemp.toString())}°</div>
                        </div>
                    </div>
                    <div class="forecast-description">${Utils.escapeHtml(description)}</div>
                    <div class="forecast-details">
                        <span><i class="fas fa-tint"></i> ${Utils.escapeHtml(humidity.toString())}%</span>
                        <span><i class="fas fa-wind"></i> ${Utils.escapeHtml(windSpeed.toString())} km/h</span>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.forecastContainer.innerHTML = forecastHTML;
    }

    /**
     * Update background based on weather conditions
     * @param {Object} current - Current weather data
     */
    updateBackground(current) {
        if (!current?.weather?.main) return;

        const now = new Date();
        const sunrise = current.sys?.sunrise ? new Date(current.sys.sunrise * 1000) : null;
        const sunset = current.sys?.sunset ? new Date(current.sys.sunset * 1000) : null;
        const isDay = sunrise && sunset ? (now >= sunrise && now <= sunset) : true;

        const gradient = Utils.getWeatherGradient(current.weather.main, isDay);
        document.body.style.background = gradient;
    }

    /**
     * Show loading states
     */
    showLoadingStates() {
        const loadingElements = [
            this.elements.tempValue,
            this.elements.weatherDescription,
            this.elements.cityName
        ];

        loadingElements.forEach(element => {
            if (element) {
                Utils.showLoading(element, '...');
            }
        });
    }

    /**
     * Hide loading states
     */
    hideLoadingStates() {
        // Loading states will be cleared when UI is updated with actual data
    }

    /**
     * Update weather alerts display (One Call API feature)
     * @param {Array} alerts - Weather alerts data
     */
    updateWeatherAlerts(alerts) {
        // Create or update alerts container
        let alertsContainer = document.getElementById('weather-alerts');
        
        if (!alertsContainer) {
            // Create alerts container if it doesn't exist
            alertsContainer = document.createElement('div');
            alertsContainer.id = 'weather-alerts';
            alertsContainer.className = 'weather-alerts';
            
            // Insert after the current weather section
            const currentWeatherSection = document.querySelector('.current-weather');
            if (currentWeatherSection) {
                currentWeatherSection.parentNode.insertBefore(alertsContainer, currentWeatherSection.nextSibling);
            }
        }

        if (alerts.length === 0) {
            alertsContainer.style.display = 'none';
            return;
        }

        alertsContainer.style.display = 'block';
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="weather-alert alert-${this.getAlertSeverity(alert.event)}">
                <div class="alert-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${Utils.escapeHtml(alert.event)}</h3>
                    <span class="alert-time">${Utils.formatDateTime(new Date(alert.start * 1000))}</span>
                </div>
                <div class="alert-description">
                    ${Utils.escapeHtml(alert.description)}
                </div>
                <div class="alert-source">
                    <small>Source: ${Utils.escapeHtml(alert.sender_name)}</small>
                </div>
            </div>
        `).join('');
    }

    /**
     * Get alert severity class based on event type
     * @param {string} event - Alert event type
     * @returns {string} Severity class
     */
    getAlertSeverity(event) {
        const severeEvents = ['tornado', 'hurricane', 'severe thunderstorm'];
        const moderateEvents = ['winter storm', 'flood', 'heat'];
        const event_lower = event.toLowerCase();
        
        if (severeEvents.some(severe => event_lower.includes(severe))) {
            return 'severe';
        } else if (moderateEvents.some(moderate => event_lower.includes(moderate))) {
            return 'moderate';
        }
        return 'minor';
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.classList.add('hidden');
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    /**
     * Animate weather updates
     */
    animateWeatherUpdates() {
        const animateElements = [
            this.elements.cityName,
            this.elements.tempValue,
            this.elements.weatherDescription,
            this.elements.hourlyForecast,
            this.elements.forecastContainer
        ];

        animateElements.forEach((element, index) => {
            if (element) {
                setTimeout(() => {
                    Utils.animateElement(element, 'slide-up');
                }, index * 100);
            }
        });
    }

    /**
     * Toggle theme between light and dark
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Update theme toggle icon
        const themeIcon = this.elements.themeToggle?.querySelector('i');
        if (themeIcon) {
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Save preference
        this.userPreferences.theme = newTheme;
        Utils.saveUserPreferences(this.userPreferences);
    }

    /**
     * Apply saved theme
     */
    applyTheme() {
        const savedTheme = this.userPreferences.theme || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update theme toggle icon
        const themeIcon = this.elements.themeToggle?.querySelector('i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    /**
     * Suggest cities based on user input (future enhancement)
     * @param {string} query - Search query
     */
    async suggestCities(query) {
        // This would implement city suggestions dropdown
        // For now, it's a placeholder for future enhancement
        console.log('City suggestions for:', query);
    }

    /**
     * Update responsive layout
     */
    updateResponsiveLayout() {
        // Handle responsive layout updates if needed
        // This is a placeholder for future responsive enhancements
    }

    /**
     * Refresh current weather data
     */
    async refreshWeatherData() {
        if (!this.currentLocation) return;

        try {
            if (this.currentLocation.lat && this.currentLocation.lon) {
                await this.loadWeatherByCoordinates(this.currentLocation.lat, this.currentLocation.lon);
            } else if (this.currentLocation.city) {
                await this.loadWeatherByCity(this.currentLocation.city);
            }
        } catch (error) {
            console.error('Refresh failed:', error);
            Utils.showError('Failed to refresh weather data.');
        }
    }

    /**
     * Get current weather data (for external use)
     * @returns {Object} Current weather data
     */
    getCurrentWeatherData() {
        return this.weatherData;
    }
}

// Create global instances - will be initialized when DOM loads
let weatherAPI;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, starting initialization...');
    
    // Create weatherAPI instance after DOM and all scripts are loaded
    weatherAPI = new WeatherAPI();
    
    // Check if API key is configured
    if (!weatherAPI.isApiKeySet()) {
        console.error('❌ API key not configured');
        Utils.showError(
            'Weather API key is not configured. Please add your OpenWeatherMap API key to the config.js file.',
            0 // Don't auto-hide this error
        );
    } else {
        console.log('✅ API key configured successfully');
    }
    
    // Initialize the weather dashboard
    window.weatherDashboard = new WeatherDashboard();
});

// Handle page visibility change to refresh data when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.weatherDashboard) {
        // Refresh data if page has been hidden for more than 10 minutes
        const lastUpdate = window.weatherDashboard.lastUpdateTime;
        if (lastUpdate && Date.now() - lastUpdate > 10 * 60 * 1000) {
            window.weatherDashboard.refreshWeatherData();
        }
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherDashboard;
}