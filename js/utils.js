// Utility Functions for Dynamic Weather Dashboard

/**
 * Utility object containing helper functions
 */
let previouslyFocusedElement;

const Utils = {
    /**
     * Format date and time
     * @param {Date|string} date - Date object or date string
     * @param {Object} options - Formatting options
     * @returns {string} Formatted date string
     */
    formatDateTime(date, options = {}) {
        if (!date) return '--';
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '--';
        const defaultOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        return dateObj.toLocaleDateString('en-US', formatOptions);
    },

    /**
     * Format date for forecast cards
     * @param {Date|string} date - Date object or date string
     * @returns {Object} Object with formatted day and date
     */
    formatForecastDate(date) {
        if (!date) return { day: '--', date: '--' };
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return { day: '--', date: '--' };
        const day = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        
        return { day, date: formattedDate };
    },

    /**
     * Format time for hourly forecast
     * @param {Date|string} date - Date object or date string
     * @returns {string} Formatted time string
     */
    formatHourlyTime(date) {
        if (!date) return '--';
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '--';
        return dateObj.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    },



    /**
     * Convert wind speed between units
     * @param {number} speed - Wind speed value
     * @param {string} from - Source unit ('ms', 'kmh', 'mph')
     * @param {string} to - Target unit ('ms', 'kmh', 'mph')
     * @returns {number} Converted wind speed
     */
    convertWindSpeed(speed, from, to) {
        if (from === to) return Math.round(speed);
        
        let ms; // Convert to m/s first
        
        switch (from.toLowerCase()) {
            case 'kmh':
                ms = speed / 3.6;
                break;
            case 'mph':
                ms = speed * 0.44704;
                break;
            case 'ms':
            default:
                ms = speed;
                break;
        }
        
        // Convert from m/s to target unit
        switch (to.toLowerCase()) {
            case 'kmh':
                return Math.round(ms * 3.6);
            case 'mph':
                return Math.round(ms / 0.44704);
            case 'ms':
            default:
                return Math.round(ms);
        }
    },

    /**
     * Get weather icon URL from OpenWeatherMap
     * @param {string} iconCode - Weather icon code
     * @param {string} size - Icon size ('small', 'medium', 'large')
     * @returns {string} Icon URL
     */
    getWeatherIconUrl(iconCode, size = 'medium') {
        const sizeMap = {
            small: '@1x',
            medium: '@2x',
            large: '@4x'
        };
        
        const sizeParam = sizeMap[size] || '@2x';
        return `https://openweathermap.org/img/wn/${iconCode}${sizeParam}.png`;
    },

    /**
     * Get background gradient based on weather condition
     * @param {string} condition - Weather condition
     * @param {boolean} isDay - Whether it's day time
     * @returns {string} CSS gradient
     */
    getWeatherGradient(condition, isDay = true) {
        const gradients = {
            clear: {
                day: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                night: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)'
            },
            clouds: {
                day: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
                night: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)'
            },
            rain: {
                day: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
                night: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)'
            },
            snow: {
                day: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
                night: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)'
            },
            thunderstorm: {
                day: 'linear-gradient(135deg, #636e72 0%, #2d3436 100%)',
                night: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
            },
            mist: {
                day: 'linear-gradient(135deg, #b2bec3 0%, #636e72 100%)',
                night: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)'
            }
        };
        
        const timeOfDay = isDay ? 'day' : 'night';
        const weatherType = condition.toLowerCase();
        
        return gradients[weatherType]?.[timeOfDay] || gradients.clear[timeOfDay];
    },

    /**
     * Get UV index description and color
     * @param {number} uvIndex - UV index value
     * @returns {Object} Object with description and color
     */
    getUVIndexInfo(uvIndex) {
        if (typeof uvIndex !== 'number' || isNaN(uvIndex)) {
            return { description: 'Unknown', color: '#999999' };
        }
        if (uvIndex <= 2) {
            return { description: 'Low', color: '#00e400' };
        } else if (uvIndex <= 5) {
            return { description: 'Moderate', color: '#ffff00' };
        } else if (uvIndex <= 7) {
            return { description: 'High', color: '#ff7e00' };
        } else if (uvIndex <= 10) {
            return { description: 'Very High', color: '#ff0000' };
        } else {
            return { description: 'Extreme', color: '#8b00ff' };
        }
    },



    /**
     * Capitalize first letter of each word
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeWords(str) {
        return str.replace(/\b\w/g, char => char.toUpperCase());
    },

    /**
     * Debounce function to limit API calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = () => {
                clearTimeout(timeout);
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Show loading state
     * @param {HTMLElement} element - Element to show loading on
     * @param {string} text - Loading text
     */
    showLoading(element, text = 'Loading...') {
        if (element) {
            const sanitizedText = this.escapeHtml(text);
            element.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner spinning"></i>
                    <span>${sanitizedText}</span>
                </div>
            `;
        }
    },

    /**
     * Hide loading state
     * @param {HTMLElement} element - Element to hide loading from
     */
    hideLoading(element) {
        if (element) {
            const spinner = element.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    },

    /**
     * Show error message
     * @param {string} message - Error message
     * @param {number} duration - Duration to show error (ms)
     */
    showError(message, duration = 5000) {
        const errorModal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        
        if (errorModal && errorMessage) {
            errorMessage.textContent = this.sanitizeText(message);
            errorModal.classList.add('show');

            previouslyFocusedElement = document.activeElement;

            const focusableElements = errorModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstFocusableElement = focusableElements[0];
            const lastFocusableElement = focusableElements[focusableElements.length - 1];

            firstFocusableElement.focus();

            errorModal.addEventListener('keydown', (e) => this.trapFocus(e, firstFocusableElement, lastFocusableElement));
            
            if (duration > 0) {
                setTimeout(() => {
                    this.hideError();
                }, duration);
            }
        }
    },

    /**
     * Hide error message
     */
    hideError() {
        const errorModal = document.getElementById('error-modal');
        if (errorModal) {
            errorModal.classList.remove('show');
            errorModal.removeEventListener('keydown', this.trapFocus);
            if (previouslyFocusedElement) {
                previouslyFocusedElement.focus();
            }
        }
    },

    /**
     * Trap focus within a modal
     * @param {Event} e - The keydown event
     * @param {HTMLElement} firstFocusableElement - The first focusable element in the modal
     * @param {HTMLElement} lastFocusableElement - The last focusable element in the modal
     */
    trapFocus(e, firstFocusableElement, lastFocusableElement) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusableElement) {
                    lastFocusableElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusableElement) {
                    firstFocusableElement.focus();
                    e.preventDefault();
                }
            }
        }
    },

    /**
     * Get user's preferred units from localStorage
     * @returns {Object} User preferences
     */
    getUserPreferences() {
        try {
            const preferences = localStorage.getItem('weatherPreferences');
            if (preferences) {
                return JSON.parse(preferences);
            }
        } catch (error) {
            console.error('Error reading preferences:', error);
        }
        
        return {
            temperature: 'C',
            windSpeed: 'kmh',
            pressure: 'hPa',
            visibility: 'km',
            theme: 'light'
        };
    },

    /**
     * Save user preferences to localStorage
     * @param {Object} preferences - User preferences
     */
    saveUserPreferences(preferences) {
        localStorage.setItem('weatherPreferences', JSON.stringify(preferences));
    },



    /**
     * Animate element entrance
     * @param {HTMLElement} element - Element to animate
     * @param {string} animation - Animation class name
     */
    animateElement(element, animation = 'fade-in') {
        if (element) {
            element.classList.add(animation);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                element.classList.remove(animation);
            }, 500);
        }
    },

    /**
     * Check if device supports geolocation
     * @returns {boolean} Whether geolocation is supported
     */
    supportsGeolocation() {
        return 'geolocation' in navigator;
    },

    /**
     * Get device location
     * @returns {Promise} Promise that resolves with coordinates
     */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!this.supportsGeolocation()) {
                reject(new Error('Geolocation is not supported by this browser.'));
                return;
            }
            
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000 // 1 minute
            };
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                error => {
                    let message = 'Unable to retrieve your location.';
                    
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'Location access denied by user.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            message = 'Location request timed out.';
                            break;
                    }
                    
                    reject(new Error(message));
                },
                options
            );
        });
    },

    /**
     * Validate and sanitize city name input
     * @param {string} cityName - City name to validate
     * @returns {string|null} Sanitized city name or null if invalid
     */
    validateCityName(cityName) {
        if (!cityName || typeof cityName !== 'string') {
            return null;
        }
        
        // Remove extra whitespace and allow international characters
        const sanitized = cityName.trim().replace(/[^\p{L}\p{N}\s,.'\-]/gu, '');
        
        // Check if sanitized name is not empty and has reasonable length
        if (sanitized.length > 0 && sanitized.length <= 100) {
            return sanitized;
        }
        
        return null;
    },

    /**
     * Format visibility value
     * @param {number} visibility - Visibility in meters
     * @param {string} unit - Target unit ('km' or 'mi')
     * @returns {string} Formatted visibility string
     */
    formatVisibility(visibility, unit = 'km') {
        const km = visibility / 1000;
        
        if (unit === 'mi') {
            const miles = km * 0.621371;
            return `${miles.toFixed(1)} mi`;
        }
        
        return `${km.toFixed(1)} km`;
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Sanitize text input
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text
     */
    sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/<script[^>]*>.*?<\/script>/gi, '')
                  .replace(/<[^>]*>/g, '')
                  .trim();
    },

    /**
     * Format pressure value
     * @param {number} pressure - Pressure in hPa
     * @param {string} unit - Target unit ('hPa', 'mb', 'inHg')
     * @returns {string} Formatted pressure string
     */
    formatPressure(pressure, unit = 'hPa') {
        switch (unit) {
            case 'inHg':
                const inHg = pressure * 0.02953;
                return `${inHg.toFixed(2)} inHg`;
            case 'mb':
                return `${pressure} mb`;
            case 'hPa':
            default:
                return `${pressure} hPa`;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}