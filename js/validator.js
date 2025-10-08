// Input Validation System
class InputValidator {
    constructor() {
        this.patterns = {
            cityName: /^[a-zA-Z\s\-'.,()]+$/,
            coordinates: /^-?\d+\.?\d*$/,
            apiKey: /^[a-zA-Z0-9]{32}$/
        };
        
        this.limits = {
            cityNameLength: 100,
            maxCoordinate: 180,
            minCoordinate: -180
        };
    }

    // Sanitize input to prevent XSS
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input
            .replace(/[<>\"'&]/g, (match) => {
                const entities = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return entities[match];
            })
            .trim()
            .substring(0, this.limits.cityNameLength);
    }

    // Validate city name
    validateCityName(cityName) {
        if (!cityName || typeof cityName !== 'string') {
            return {
                isValid: false,
                error: 'City name is required',
                sanitized: ''
            };
        }

        const sanitized = this.sanitizeInput(cityName);
        
        if (sanitized.length < 2) {
            return {
                isValid: false,
                error: 'City name must be at least 2 characters',
                sanitized
            };
        }

        if (sanitized.length > this.limits.cityNameLength) {
            return {
                isValid: false,
                error: `City name must be less than ${this.limits.cityNameLength} characters`,
                sanitized
            };
        }

        if (!this.patterns.cityName.test(sanitized)) {
            return {
                isValid: false,
                error: 'City name contains invalid characters',
                sanitized
            };
        }

        return {
            isValid: true,
            error: null,
            sanitized
        };
    }

    // Validate coordinates
    validateCoordinates(lat, lon) {
        const errors = [];

        // Validate latitude
        if (typeof lat !== 'number' || isNaN(lat)) {
            errors.push('Invalid latitude format');
        } else if (lat < -90 || lat > 90) {
            errors.push('Latitude must be between -90 and 90');
        }

        // Validate longitude
        if (typeof lon !== 'number' || isNaN(lon)) {
            errors.push('Invalid longitude format');
        } else if (lon < -180 || lon > 180) {
            errors.push('Longitude must be between -180 and 180');
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitized: {
                lat: Number(lat),
                lon: Number(lon)
            }
        };
    }

    // Validate API response data
    validateWeatherData(data) {
        const required = ['main', 'weather', 'name'];
        const errors = [];

        if (!data || typeof data !== 'object') {
            return {
                isValid: false,
                errors: ['Invalid weather data format']
            };
        }

        required.forEach(field => {
            if (!data[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        // Validate temperature data
        if (data.main) {
            if (typeof data.main.temp !== 'number' || data.main.temp < -100 || data.main.temp > 100) {
                errors.push('Invalid temperature data');
            }
            if (typeof data.main.humidity !== 'number' || data.main.humidity < 0 || data.main.humidity > 100) {
                errors.push('Invalid humidity data');
            }
        }

        // Validate weather array
        if (data.weather && (!Array.isArray(data.weather) || data.weather.length === 0)) {
            errors.push('Invalid weather information');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate URL to prevent SSRF attacks
    validateUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Only allow HTTPS
            if (urlObj.protocol !== 'https:') {
                return {
                    isValid: false,
                    error: 'Only HTTPS URLs are allowed'
                };
            }

            // Whitelist allowed hosts
            const allowedHosts = [
                'api.openweathermap.org',
                'tile.openweathermap.org'
            ];

            if (!allowedHosts.includes(urlObj.hostname)) {
                return {
                    isValid: false,
                    error: 'Host not in whitelist'
                };
            }

            return {
                isValid: true,
                error: null
            };
        } catch (error) {
            return {
                isValid: false,
                error: 'Invalid URL format'
            };
        }
    }

    // Rate limiting validation
    validateRateLimit(requestCount, timeWindow, maxRequests = 60) {
        const now = Date.now();
        const windowStart = now - timeWindow;
        
        if (requestCount >= maxRequests) {
            return {
                isValid: false,
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil((timeWindow - (now % timeWindow)) / 1000)
            };
        }

        return {
            isValid: true,
            error: null
        };
    }
}

// Global validator instance
window.InputValidator = new InputValidator();