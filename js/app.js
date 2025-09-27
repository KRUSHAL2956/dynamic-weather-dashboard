// Main Application - Weather Dashboard Controller

/**
 * WeatherDashboard - Main application class
 */
class WeatherDashboard {
    constructor() {
        this.currentLocation = null;
        this.weatherData = null;
        this.userPreferences = Utils.getUserPreferences();
        this.lastUpdateTime = null;
        this.selectedSuggestionIndex = -1;
        
        // DOM Elements
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            cityInput: document.getElementById('city-input'),
            searchBtn: document.getElementById('search-btn'),
            locationBtn: document.getElementById('location-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            citySuggestions: document.getElementById('city-suggestions'),
            
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
            
            // Map elements
            weatherMap: document.getElementById('weather-map'),
            mapLayerSelect: document.getElementById('map-layer-select'),
            
            // Modal elements
            errorModal: document.getElementById('error-modal'),
            modalClose: document.getElementById('modal-close'),
            modalOk: document.getElementById('modal-ok')
        };
        
        // Weather map reference
        this.weatherMapRef = null;
        this.weatherLayer = null;
        
        this.init();
    }

    /** Initialize the application */
    async init() {
        try {
            this.setupEventListeners();
            this.applyTheme();
            
            // Weather map will be initialized automatically by global script
            
            // Try to load weather for user's current location
            await this.loadCurrentLocationWeather();
            
        } catch (error) {
            console.error('Initialization error:', error);
            Utils.showError('Failed to initialize the application. Please refresh the page.');
        } finally {
            this.hideLoadingScreen();
        }
    }

    /** Setup event listeners */
    setupEventListeners() {
        // Search functionality
        this.elements.searchBtn?.addEventListener('click', () => this.handleSearch());
        this.elements.cityInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Setup city search with autocomplete
        if (this.elements.cityInput) {
            const debouncedSearch = Utils.debounce((value) => {
                if (value.length >= 2) {
                    this.suggestCities(value);
                } else {
                    this.hideCitySuggestions();
                }
            }, 300);

            this.elements.cityInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });

            this.elements.cityInput.addEventListener('keydown', (e) => {
                this.handleSuggestionKeyboard(e);
            });

            this.elements.cityInput.addEventListener('blur', () => {
                setTimeout(() => this.hideCitySuggestions(), 200);
            });

            this.elements.cityInput.addEventListener('focus', (e) => {
                if (e.target.value.length >= 2) {
                    this.suggestCities(e.target.value);
                }
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

        // Weather layers are controlled by buttons in HTML
    }

    /** Handle city search */
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

    /** Handle current location request */
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
            if (Utils.supportsGeolocation()) {
                const position = await Utils.getCurrentLocation();
                await this.loadWeatherByCoordinates(position.latitude, position.longitude);
            } else {
                // Fallback to a default city if geolocation is not supported
                await this.loadWeatherByCity('London');
            }
        } catch (error) {
            console.warn('Could not load current location weather:', error);
            // Fallback to a default city
            try {
                await this.loadWeatherByCity('London');
            } catch (fallbackError) {
                console.warn('Fallback city failed, using demo data:', fallbackError);
                // Use demo data as final fallback
                try {
                    const demoData = weatherAPI.getDemoWeatherData();
                    this.weatherData = demoData;
                    await this.updateUI(demoData);
                    Utils.showError('Using demo data. Please check your API key configuration.', 10000);
                } catch (demoError) {
                    console.error('Demo data failed:', demoError);
                    Utils.showError('Unable to load weather data. Please check your configuration.');
                }
            }
        }
    }

    /** Load weather by city name */
    async loadWeatherByCity(cityName) {
        try {
            this.showLoadingStates();
            
            const weatherData = await weatherAPI.getCompleteWeatherData({ city: cityName });
            this.weatherData = weatherData;
            this.currentLocation = { city: cityName };
            this.lastUpdateTime = Date.now();
            
            await this.updateUI(weatherData);
            
        } catch (error) {
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

    /** Update UI with weather data */
    async updateUI(weatherData) {
        // Update current weather (include UV data if available)
        this.updateCurrentWeather(weatherData.current, weatherData.location, weatherData.uvData);
        
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
        
        // Update weather map location if available
        this.updateMapLocation(weatherData.current);
        
        // Animate elements
        this.animateWeatherUpdates();
    }

    /**
     * Update current weather display
     * @param {Object} current - Current weather data
     * @param {Object} location - Location data (optional)
     */
    updateCurrentWeather(current, location = null, uvData = null) {
        // Update location display
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

        // Update weather icon
        if (this.elements.weatherIcon && current.weather?.[0]?.icon) {
            const iconCode = current.weather[0].icon;
            const iconUrl = Utils.getWeatherIconUrl(iconCode, 'large');
            
            this.elements.weatherIcon.src = iconUrl;
            this.elements.weatherIcon.alt = current.weather[0].description || 'Weather icon';
            this.elements.weatherIcon.style.width = '80px';
            this.elements.weatherIcon.style.height = '80px';
            this.elements.weatherIcon.style.objectFit = 'contain';
            
            this.elements.weatherIcon.onerror = function() {
                console.warn('Failed to load main weather icon:', iconCode);
                this.src = 'https://openweathermap.org/img/wn/01d@4x.png';
            };
            
            this.elements.weatherIcon.onload = function() {
                console.log('Main weather icon loaded:', iconCode);
            };
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
            if (uvData && uvData.current && typeof uvData.current.uvi !== 'undefined') {
                const uvFormat = Utils.formatUVIndex(uvData.current.uvi);
                this.elements.uvIndex.textContent = uvFormat.value;
                
                // Show different tooltip for estimated vs real data
                if (uvData.simulated) {
                    this.elements.uvIndex.title = `${uvFormat.description} (Estimated)`;
                    this.elements.uvIndex.style.fontStyle = 'italic';
                    console.log(`📊 UV Index estimated: ${uvFormat.value} (${uvFormat.level})`);
                } else {
                    this.elements.uvIndex.title = uvFormat.description;
                    this.elements.uvIndex.style.fontStyle = 'normal';
                    console.log(`✅ UV Index loaded: ${uvFormat.value} (${uvFormat.level})`);
                }
                
                this.elements.uvIndex.style.color = uvFormat.color;
                this.elements.uvIndex.style.fontWeight = 'bold';
            } else {
                this.elements.uvIndex.textContent = '--';
                this.elements.uvIndex.title = 'UV index data unavailable';
                this.elements.uvIndex.style.color = '';
                this.elements.uvIndex.style.fontWeight = '';
                this.elements.uvIndex.style.fontStyle = '';
                console.log('⚠️ UV Index data not available');
            }
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

        const hourlyHTML = hourlyData.map(hour => {
            const time = Utils.formatHourlyTime(new Date(hour.dt * 1000));
            const iconCode = hour.weather?.[0]?.icon || '01d';
            const iconUrl = Utils.getWeatherIconUrl(iconCode, 'small');
            const description = Utils.sanitizeText(hour.weather?.[0]?.description || 'Weather');
            const temp = hour.main?.temp !== undefined ? Math.round(hour.main.temp) : '--';
            
            return `
                <div class="hourly-item">
                    <div class="hourly-time">${Utils.escapeHtml(time)}</div>
                    <div class="hourly-icon">
                        <img src="${Utils.escapeHtml(iconUrl)}" 
                             alt="${Utils.escapeHtml(description)}"
                             onerror="this.src='https://openweathermap.org/img/wn/01d@2x.png'; this.style.background='rgba(255,99,71,0.1)'; console.warn('Failed to load weather icon: ${iconCode}');"
                             onload="this.style.opacity='1'; console.log('Hourly icon loaded: ${iconCode}');"
                             style="width: 40px; height: 40px; object-fit: contain; opacity: 0; transition: opacity 0.3s ease;">
                    </div>
                    <div class="hourly-temp">${Utils.escapeHtml(temp.toString())}°</div>
                </div>
            `;
        }).join('');

        this.elements.hourlyForecast.innerHTML = hourlyHTML;
        console.log('✅ Hourly forecast updated with', hourlyData.length, 'items');
    }

    /**
     * Update daily forecast display
     * @param {Array} dailyData - Daily forecast data
     */
    updateDailyForecast(dailyData) {
        if (!this.elements.forecastContainer || !dailyData || !Array.isArray(dailyData)) {
            return;
        }

        const forecastHTML = dailyData.map(day => {
            const dateInfo = Utils.formatForecastDate(new Date(day.dt * 1000));
            const iconCode = day.weather?.[0]?.icon || '01d';
            const iconUrl = Utils.getWeatherIconUrl(iconCode, 'medium');
            const description = Utils.capitalizeWords(Utils.sanitizeText(day.weather?.[0]?.description || 'Weather'));
            const maxTemp = day.temp?.max !== undefined ? Math.round(day.temp.max) : '--';
            const minTemp = day.temp?.min !== undefined ? Math.round(day.temp.min) : '--';
            const humidity = day.humidity !== undefined ? day.humidity : '--';
            const windSpeed = day.wind?.speed !== undefined ? Utils.convertWindSpeed(day.wind.speed, 'ms', 'kmh') : '--';
            
            return `
                <div class="forecast-card">
                    <div class="forecast-header">
                        <div>
                            <div class="forecast-day">${Utils.escapeHtml(dateInfo.day)}</div>
                            <div class="forecast-date">${Utils.escapeHtml(dateInfo.date)}</div>
                        </div>
                        <div class="forecast-icon">
                            <img src="${Utils.escapeHtml(iconUrl)}" 
                                 alt="${Utils.escapeHtml(description)}"
                                 onerror="this.src='https://openweathermap.org/img/wn/01d@2x.png'; this.style.background='rgba(255,99,71,0.1)'; console.warn('Failed to load forecast icon: ${iconCode}');"
                                 onload="this.style.opacity='1'; console.log('Forecast icon loaded: ${iconCode}');"
                                 style="width: 50px; height: 50px; object-fit: contain; opacity: 0; transition: opacity 0.3s ease;">
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
        console.log('✅ Daily forecast updated with', dailyData.length, 'items');
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
     * Suggest cities based on user input
     * @param {string} query - Search query
     */
    async suggestCities(query) {
        if (!query || query.length < 2) {
            this.hideCitySuggestions();
            return;
        }

        try {
            console.log('🔍 Getting city suggestions for:', query);
            const cities = await weatherAPI.searchCities(query, 5);
            this.displayCitySuggestions(cities);
        } catch (error) {
            console.error('City suggestions failed:', error);
            this.hideCitySuggestions();
        }
    }

    /**
     * Display city suggestions in dropdown
     * @param {Array} cities - Array of city objects
     */
    displayCitySuggestions(cities) {
        if (!this.elements.citySuggestions || !cities || cities.length === 0) {
            this.hideCitySuggestions();
            return;
        }

        const suggestionsHTML = cities.map((city, index) => {
            const displayName = Utils.escapeHtml(city.displayName);
            const cityName = Utils.escapeHtml(city.name);
            const country = Utils.escapeHtml(city.country);
            
            return `
                <div class="suggestion-item" data-index="${index}" data-city="${Utils.escapeHtml(city.name)}" data-lat="${city.lat}" data-lon="${city.lon}">
                    <i class="fas fa-map-marker-alt suggestion-icon"></i>
                    <div>
                        <div class="suggestion-city">${cityName}</div>
                        <div class="suggestion-country">${country}${city.state ? ', ' + Utils.escapeHtml(city.state) : ''}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.citySuggestions.innerHTML = suggestionsHTML;
        this.elements.citySuggestions.classList.remove('hidden');
        
        // Add click event listeners to suggestions
        this.elements.citySuggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectCitySuggestion(item);
            });
        });
        
        this.selectedSuggestionIndex = -1;
        console.log('📋 Displayed', cities.length, 'city suggestions');
    }

    /**
     * Hide city suggestions dropdown
     */
    hideCitySuggestions() {
        if (this.elements.citySuggestions) {
            this.elements.citySuggestions.classList.add('hidden');
            this.elements.citySuggestions.innerHTML = '';
        }
        this.selectedSuggestionIndex = -1;
    }

    /**
     * Select a city suggestion
     * @param {HTMLElement} suggestionElement - The selected suggestion element
     */
    async selectCitySuggestion(suggestionElement) {
        const cityName = suggestionElement.dataset.city;
        const lat = parseFloat(suggestionElement.dataset.lat);
        const lon = parseFloat(suggestionElement.dataset.lon);
        
        // Update input field
        this.elements.cityInput.value = cityName;
        
        // Hide suggestions
        this.hideCitySuggestions();
        
        // Load weather for selected city using coordinates for better accuracy
        try {
            await this.loadWeatherByCoordinates(lat, lon);
            console.log('✅ Weather loaded for selected city:', cityName);
        } catch (error) {
            console.error('Failed to load weather for selected city:', error);
            Utils.showError(`Failed to load weather for ${cityName}`);
        }
    }

    /**
     * Handle keyboard navigation in city suggestions
     * @param {Event} e - Keyboard event
     */
    handleSuggestionKeyboard(e) {
        const suggestions = this.elements.citySuggestions?.querySelectorAll('.suggestion-item');
        if (!suggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, suggestions.length - 1);
                this.highlightSuggestion(suggestions);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                this.highlightSuggestion(suggestions);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedSuggestionIndex >= 0 && suggestions[this.selectedSuggestionIndex]) {
                    this.selectCitySuggestion(suggestions[this.selectedSuggestionIndex]);
                } else {
                    this.handleSearch();
                }
                break;
                
            case 'Escape':
                this.hideCitySuggestions();
                break;
        }
    }

    /**
     * Highlight the selected suggestion
     * @param {NodeList} suggestions - List of suggestion elements
     */
    highlightSuggestion(suggestions) {
        suggestions.forEach((item, index) => {
            if (index === this.selectedSuggestionIndex) {
                item.classList.add('highlighted');
            } else {
                item.classList.remove('highlighted');
            }
        });
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
     * Update weather map location when weather data changes
     * @param {Object} weatherData - Current weather data
     */
    updateMapLocation(weatherData) {
        if (!weatherData?.coord) {
            console.log('🗺️ App: No coordinate data for map update');
            return;
        }

        try {
            const { lat, lon } = weatherData.coord;
            const cityName = this.elements.cityName.textContent || 'Current Location';
            
            // Use global updateMapLocation function if available
            if (typeof window.updateMapLocation === 'function') {
                console.log(`🗺️ App: Updating map location to ${cityName} (${lat}, ${lon})`);
                window.updateMapLocation(lat, lon, cityName);
            } else {
                console.log('🗺️ App: Map location update function not available yet');
            }

        } catch (error) {
            console.error('🗺️ App: Error updating map location:', error);
        }
    }

    /**
     * Add weather layer to the map
     * @param {Object} map - Leaflet map instance
     * @param {string} layerType - Type of weather layer
     */
    addWeatherLayer(map, layerType) {
        console.log('🗺️ Adding weather layer:', layerType);
        
        // Remove existing weather layer
        if (window.currentWeatherLayer) {
            map.removeLayer(window.currentWeatherLayer);
        }
        
        const apiKey = CONFIG.OPENWEATHER_API_KEY;
        if (!apiKey) {
            console.warn('🗺️ No OpenWeatherMap API key available');
            return;
        }
        
        let tileUrl;
        switch (layerType) {
            case 'wind':
                tileUrl = `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`;
                break;
            case 'rain':
                tileUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`;
                break;
            case 'temp':
                tileUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`;
                break;
            case 'clouds':
                tileUrl = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`;
                break;
            default:
                console.warn('🗺️ Unknown layer type:', layerType);
                return;
        }
        
        // Add new weather layer
        window.currentWeatherLayer = L.tileLayer(tileUrl, {
            attribution: '© OpenWeatherMap',
            opacity: 0.6,
            maxZoom: 18
        }).addTo(map);
        
        console.log('🗺️ Weather layer added successfully:', layerType);
    }

    /**
     * Fallback map initialization if Windy fails
     */
    initializeFallbackMap() {
        console.log('🗺️ Initializing fallback map...');
        
        // Create a simple placeholder if Windy fails
        this.elements.weatherMap.innerHTML = `
            <div class="map-fallback">
                <div class="fallback-content">
                    <i class="fas fa-map-marked-alt" style="font-size: 48px; color: #666; margin-bottom: 16px;"></i>
                    <h3>Weather Map</h3>
                    <p>Interactive weather map is loading...</p>
                    <button onclick="location.reload()" class="btn btn-primary">Refresh Map</button>
                </div>
            </div>
        `;
    }

    /**
     * Change weather layer
     * @param {string} layerType - Type of weather layer (wind, rain, temp, clouds)
     */
    changeWindyLayer(layerType) {
        console.log('🗺️ App: Changing weather layer to:', layerType);
        
        // Use global changeWindyLayer function from HTML
        if (typeof window.changeWindyLayer === 'function') {
            window.changeWindyLayer(layerType);
        } else {
            console.warn('🗺️ App: Global changeWindyLayer function not available');
        }
    }

    /**
     * Update map button states
     */
    updateMapButtonStates(activeLayer) {
        const buttons = document.querySelectorAll('.map-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`${activeLayer}-btn`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    /**
     * Change weather layer
     * @param {string} layerType - New layer type
     */
    changeWeatherLayer(layerType) {
        console.log('🗺️ changeWeatherLayer called with:', layerType);
        this.addWeatherLayer(layerType);
    }

    /**
     * Update weather map with current location
     * @param {Object} weatherData - Current weather data
     */
    updateWeatherMap(weatherData) {
        console.log('🗺️ App: Updating weather map with data:', !!weatherData);
        
        const map = window.leafletMap;
        
        if (!map) {
            console.log('🗺️ App: Weather map not available yet');
            return;
        }

        if (!weatherData?.coord) {
            console.warn('🗺️ App: No coordinate data available');
            return;
        }

        try {
            const { lat, lon } = weatherData.coord;
            console.log('🗺️ App: Centering map on:', lat, lon);
            
            // Center Leaflet map on current location
            map.setView([lat, lon], 8);
            
            console.log('🗺️ App: Weather map updated successfully');

        } catch (error) {
            console.error('🗺️ App: Failed to update weather map:', error);
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

// Create global instances
const weatherAPI = new WeatherAPI();

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if API key is configured
    if (!weatherAPI.isApiKeySet()) {
        Utils.showError(
            'Weather API key is not configured. Please add your OpenWeatherMap API key to the config.js file.',
            0 // Don't auto-hide this error
        );
    }
    
    // Initialize the weather dashboard
    window.weatherDashboard = new WeatherDashboard();
});

// Global map variables
let globalMap = null;
let currentWeatherLayer = null;

// Global function to initialize map
window.initMap = function() {
    const mapContainer = document.getElementById('weather-map');
    if (!mapContainer) return;
    
    console.log('🗺️ App: Triggering weather map initialization...');
    
    // Use the global initMap function from HTML
    // Weather map initialization is handled by global script in HTML
    console.log('🗺️ App: Weather map will be initialized automatically');
};

// Weather layers are now handled by the global functions in index.html

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