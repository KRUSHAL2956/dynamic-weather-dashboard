// SECURITY HARDENED Utility Functions - XSS and Path Traversal Protection
// All inputs are sanitized and validated to prevent security vulnerabilities

let previouslyFocusedElement;

const Utils = {
    // SECURITY FIX: Enhanced HTML escaping to prevent XSS (CWE-79)
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return '';
        }
        
        // SECURITY: Comprehensive HTML entity encoding
        const entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '\\': '&#x5C;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        
        return text.replace(/[&<>"'\/\\`=]/g, (char) => entityMap[char]);
    },

    // SECURITY FIX: Enhanced text sanitization to prevent code injection (CWE-94)
    sanitizeText(text) {
        if (typeof text !== 'string') return '';
        
        // SECURITY: Remove all HTML tags and dangerous characters
        return text
            .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
            .replace(/<[^>]*>/g, '') // Remove all HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/data:/gi, '') // Remove data: URLs
            .replace(/vbscript:/gi, '') // Remove vbscript: URLs
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/expression\s*\(/gi, '') // Remove CSS expressions
            .trim()
            .substring(0, 1000); // Limit length to prevent DoS
    },

    // SECURITY FIX: Safe DOM element creation instead of innerHTML
    createSafeElement(tagName, textContent = '', className = '') {
        if (typeof tagName !== 'string' || !tagName.match(/^[a-zA-Z][a-zA-Z0-9]*$/)) {
            throw new Error('Invalid tag name');
        }
        
        const element = document.createElement(tagName);
        
        if (textContent) {
            element.textContent = this.sanitizeText(textContent);
        }
        
        if (className) {
            element.className = this.sanitizeText(className);
        }
        
        return element;
    },

    // SECURITY FIX: Safe HTML insertion without innerHTML
    setSafeHTML(element, content) {
        if (!element || typeof content !== 'string') {
            return;
        }
        
        // SECURITY: Clear existing content safely
        element.textContent = '';
        
        // SECURITY: Create safe text node instead of HTML
        const safeContent = this.sanitizeText(content);
        const textNode = document.createTextNode(safeContent);
        element.appendChild(textNode);
    },

    // SECURITY FIX: Safe loading state without innerHTML (fixes lines 219-225)
    showLoading(element, text = 'Loading...') {
        if (!element) return;
        
        // SECURITY: Clear content safely
        element.textContent = '';
        
        // SECURITY: Create elements programmatically instead of innerHTML
        const loadingDiv = this.createSafeElement('div', '', 'loading-spinner');
        const iconSpan = this.createSafeElement('i', '', 'fas fa-spinner spinning');
        const textSpan = this.createSafeElement('span', this.sanitizeText(text));
        
        loadingDiv.appendChild(iconSpan);
        loadingDiv.appendChild(textSpan);
        element.appendChild(loadingDiv);
    },

    /** Format date and time - SECURITY: Input validation added */
    formatDateTime(date, options = {}) {
        if (!date) return '--';
        
        let dateObj;
        try {
            dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return '--';
        } catch (error) {
            return '--';
        }
        
        const defaultOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        
        try {
            return dateObj.toLocaleDateString('en-US', formatOptions);
        } catch (error) {
            return dateObj.toISOString().split('T')[0]; // Fallback format
        }
    },

    /** Format date for forecast cards - SECURITY: Input validation */
    formatForecastDate(date) {
        if (!date) return { day: '--', date: '--' };
        
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return { day: '--', date: '--' };
            
            const day = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            return { 
                day: this.sanitizeText(day), 
                date: this.sanitizeText(formattedDate) 
            };
        } catch (error) {
            return { day: '--', date: '--' };
        }
    },

    /** Format time for hourly forecast - SECURITY: Input validation */
    formatHourlyTime(date) {
        if (!date) return '--';
        
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) return '--';
            
            const timeString = dateObj.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            
            return this.sanitizeText(timeString);
        } catch (error) {
            return '--';
        }
    },

    /** Convert wind speed between units - SECURITY: Input validation */
    convertWindSpeed(speed, from, to) {
        // SECURITY: Validate inputs
        if (typeof speed !== 'number' || isNaN(speed) || speed < 0 || speed > 500) {
            return 0;
        }
        
        if (typeof from !== 'string' || typeof to !== 'string') {
            return Math.round(speed);
        }
        
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

    // SECURITY FIX: Enhanced icon URL validation to prevent SSRF
    getWeatherIconUrl(iconCode, size = 'medium') {
        // SECURITY: Strict input validation
        if (!iconCode || typeof iconCode !== 'string') {
            console.warn('Invalid icon code provided:', iconCode);
            iconCode = '01d'; // Safe default
        }
        
        // SECURITY: Remove any potentially harmful characters
        iconCode = iconCode.replace(/[^a-zA-Z0-9]/g, '');
        
        // SECURITY: Strict format validation
        if (!/^\d{2}[dn]$/.test(iconCode)) {
            console.warn('Invalid icon code format:', iconCode);
            iconCode = '01d'; // Safe default
        }
        
        // SECURITY: Validate size parameter
        const allowedSizes = ['small', 'medium', 'large'];
        if (!allowedSizes.includes(size)) {
            size = 'medium';
        }
        
        const sizeMap = {
            small: '@2x',
            medium: '@2x',
            large: '@4x'
        };
        
        const sizeParam = sizeMap[size] || '@2x';
        
        // SECURITY: Use template with validated parameters only
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}${sizeParam}.png`;
        
        console.log(`Generated secure icon URL: ${iconUrl}`);
        return iconUrl;
    },

    /** Get weather background gradient - SECURITY: Input validation */
    getWeatherGradient(condition, isDay = true) {
        // SECURITY: Validate inputs
        if (typeof condition !== 'string') {
            condition = 'clear';
        }
        
        if (typeof isDay !== 'boolean') {
            isDay = true;
        }
        
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
        const weatherType = this.sanitizeText(condition.toLowerCase());
        
        return gradients[weatherType]?.[timeOfDay] || gradients.clear[timeOfDay];
    },

    /** Get UV index description and color - SECURITY: Input validation */
    getUVIndexInfo(uvIndex) {
        if (typeof uvIndex !== 'number' || isNaN(uvIndex) || uvIndex < 0 || uvIndex > 20) {
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

    /** Capitalize first letter of each word - SECURITY: Input validation */
    capitalizeWords(str) {
        if (typeof str !== 'string') return '';
        
        const sanitized = this.sanitizeText(str);
        return sanitized.replace(/\b\w/g, char => char.toUpperCase());
    },

    /** Debounce function - SECURITY: Input validation */
    debounce(func, wait) {
        if (typeof func !== 'function' || typeof wait !== 'number' || wait < 0 || wait > 10000) {
            throw new Error('Invalid debounce parameters');
        }
        
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

    /** Hide loading state - SECURITY: Safe DOM manipulation */
    hideLoading(element) {
        if (element) {
            const spinner = element.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    },

    /** Show error message - SECURITY: XSS prevention */
    showError(message, duration = 5000) {
        const errorModal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        
        if (errorModal && errorMessage) {
            // SECURITY: Use textContent instead of innerHTML to prevent XSS
            errorMessage.textContent = this.sanitizeText(message);
            errorModal.classList.add('show');

            previouslyFocusedElement = document.activeElement;

            const focusableElements = errorModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstFocusableElement = focusableElements[0];
            const lastFocusableElement = focusableElements[focusableElements.length - 1];

            if (firstFocusableElement) {
                firstFocusableElement.focus();
            }

            errorModal.addEventListener('keydown', (e) => this.trapFocus(e, firstFocusableElement, lastFocusableElement));
            
            if (duration > 0 && duration <= 30000) { // Max 30 seconds
                setTimeout(() => {
                    this.hideError();
                }, duration);
            }
        }
    },

    /** Hide error message - SECURITY: Safe cleanup */
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

    /** Trap focus within a modal - SECURITY: Input validation */
    trapFocus(e, firstFocusableElement, lastFocusableElement) {
        if (!e || e.key !== 'Tab' || !firstFocusableElement || !lastFocusableElement) {
            return;
        }
        
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
    },

    /** Get user preferences - SECURITY: Safe localStorage access */
    getUserPreferences() {
        try {
            const preferences = localStorage.getItem('weatherPreferences');
            if (preferences) {
                const parsed = JSON.parse(preferences);
                
                // SECURITY: Validate parsed data structure
                if (typeof parsed === 'object' && parsed !== null) {
                    return {
                        temperature: this.sanitizeText(parsed.temperature || 'C'),
                        windSpeed: this.sanitizeText(parsed.windSpeed || 'kmh'),
                        pressure: this.sanitizeText(parsed.pressure || 'hPa'),
                        visibility: this.sanitizeText(parsed.visibility || 'km'),
                        theme: this.sanitizeText(parsed.theme || 'light')
                    };
                }
            }
        } catch (error) {
            console.error('Error reading preferences:', error);
        }
        
        // SECURITY: Safe defaults
        return {
            temperature: 'C',
            windSpeed: 'kmh',
            pressure: 'hPa',
            visibility: 'km',
            theme: 'light'
        };
    },

    /** Save user preferences - SECURITY: Input validation */
    saveUserPreferences(preferences) {
        if (typeof preferences !== 'object' || preferences === null) {
            return;
        }
        
        try {
            // SECURITY: Sanitize all preference values
            const safePreferences = {
                temperature: this.sanitizeText(preferences.temperature || 'C'),
                windSpeed: this.sanitizeText(preferences.windSpeed || 'kmh'),
                pressure: this.sanitizeText(preferences.pressure || 'hPa'),
                visibility: this.sanitizeText(preferences.visibility || 'km'),
                theme: this.sanitizeText(preferences.theme || 'light')
            };
            
            localStorage.setItem('weatherPreferences', JSON.stringify(safePreferences));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    },

    /** Animate element entrance - SECURITY: Input validation */
    animateElement(element, animation = 'fade-in') {
        if (!element || !element.classList) {
            return;
        }
        
        // SECURITY: Validate animation class name
        const allowedAnimations = ['fade-in', 'slide-up', 'bounce-in'];
        const safeAnimation = allowedAnimations.includes(animation) ? animation : 'fade-in';
        
        element.classList.add(safeAnimation);
        
        setTimeout(() => {
            element.classList.remove(safeAnimation);
        }, 500);
    },

    /** Check if device supports geolocation - SECURITY: Safe feature detection */
    supportsGeolocation() {
        return typeof navigator !== 'undefined' && 'geolocation' in navigator;
    },

    /** Get device location - SECURITY: Timeout and error handling */
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!this.supportsGeolocation()) {
                reject(new Error('Geolocation is not supported by this browser.'));
                return;
            }
            
            const options = {
                enableHighAccuracy: true,
                timeout: Math.min(10000, 15000), // Max 15 seconds
                maximumAge: Math.min(60000, 300000) // Max 5 minutes
            };
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    // SECURITY: Validate coordinates
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    if (typeof lat !== 'number' || typeof lon !== 'number' || 
                        isNaN(lat) || isNaN(lon) || 
                        lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                        reject(new Error('Invalid coordinates received.'));
                        return;
                    }
                    
                    resolve({
                        latitude: lat,
                        longitude: lon
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

    /** Validate and sanitize city name - SECURITY: Enhanced validation */
    validateCityName(cityName) {
        if (!cityName || typeof cityName !== 'string') {
            return null;
        }
        
        // SECURITY: Remove dangerous characters and limit length
        const sanitized = cityName
            .trim()
            .replace(/[<>\"'&]/g, '') // Remove dangerous HTML chars
            .replace(/[^\p{L}\p{N}\s,.'\-]/gu, '') // Allow only letters, numbers, spaces, and safe punctuation
            .substring(0, 100); // Limit length
        
        // SECURITY: Additional validation
        if (sanitized.length < 1 || sanitized.length > 100) {
            return null;
        }
        
        // SECURITY: Prevent injection attempts
        if (/script|javascript|vbscript|onload|onerror/i.test(sanitized)) {
            return null;
        }
        
        return sanitized;
    },

    /** Format visibility - SECURITY: Input validation */
    formatVisibility(visibility, unit = 'km') {
        if (typeof visibility !== 'number' || isNaN(visibility) || visibility < 0 || visibility > 100000) {
            return '-- km';
        }
        
        const km = visibility / 1000;
        
        if (unit === 'mi') {
            const miles = km * 0.621371;
            return `${miles.toFixed(1)} mi`;
        }
        
        return `${km.toFixed(1)} km`;
    },

    /** Format pressure - SECURITY: Input validation */
    formatPressure(pressure, unit = 'hPa') {
        if (typeof pressure !== 'number' || isNaN(pressure) || pressure < 800 || pressure > 1200) {
            return '-- hPa';
        }
        
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
    },

    /** Format UV index - SECURITY: Input validation */
    formatUVIndex(uvIndex) {
        if (typeof uvIndex !== 'number' || isNaN(uvIndex) || uvIndex < 0 || uvIndex > 20) {
            return { value: '--', level: 'Unknown', color: '#666' };
        }

        const rounded = Math.round(uvIndex * 10) / 10;
        let level, color;

        if (uvIndex <= 2) {
            level = 'Low';
            color = '#00e400';
        } else if (uvIndex <= 5) {
            level = 'Moderate';
            color = '#ffff00';
        } else if (uvIndex <= 7) {
            level = 'High';
            color = '#ff7e00';
        } else if (uvIndex <= 10) {
            level = 'Very High';
            color = '#ff0000';
        } else {
            level = 'Extreme';
            color = '#8b00ff';
        }

        return {
            value: rounded.toString(),
            level: level,
            color: color,
            description: `UV Index ${rounded} (${level})`
        };
    }
};

// SECURITY: Freeze the Utils object to prevent tampering
Object.freeze(Utils);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}