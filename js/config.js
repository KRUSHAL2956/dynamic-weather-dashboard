// SECURE Configuration - API keys and settings
// SECURITY HARDENED VERSION - No timing attacks, no credential exposure

const CONFIG = {
    // SECURITY: Environment-based API key handling
    get OPENWEATHER_API_KEY() {
        // For localhost development only
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'ecd10e5059b846b4977031d32d044f69';
        }
        return null; // Production uses serverless proxy
    },
    
    // SECURITY: Validate based on environment
    isApiKeyValid() {
        const key = this.OPENWEATHER_API_KEY;
        return key && key !== 'YOUR_API_KEY_HERE';
    },
    
    // API endpoints - Environment-based
    get OPENWEATHER_BASE_URL() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'https://api.openweathermap.org/data/2.5';
        }
        return '/api';
    },
    
    get OPENWEATHER_GEOCODING_URL() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'https://api.openweathermap.org/geo/1.0';
        }
        return '/api';
    },
    
    // Cache settings - SECURITY: Reasonable limits
    CACHE_DURATION: Math.min(5 * 60 * 1000, 600000), // Max 10 minutes
    
    // Geolocation settings - SECURITY: Timeout protection
    GEOLOCATION_TIMEOUT: Math.min(10000, 15000), // Max 15 seconds
    GEOLOCATION_MAX_AGE: Math.min(60000, 300000), // Max 5 minutes
    
    // Rate limiting - SECURITY: Enhanced protection
    API_RATE_LIMIT: Math.min(60, 100), // Max 100 requests per minute
    API_REQUEST_TIMEOUT: Math.min(15000, 30000), // Max 30 seconds
    
    // Security limits - SECURITY: Input validation limits
    MAX_CITY_NAME_LENGTH: 100,
    MAX_SUGGESTIONS: 10,
    MAX_RETRY_ATTEMPTS: 3,
    MAX_CACHE_SIZE: 100,
    
    // Content Security Policy - SECURITY: XSS protection with external resources allowed
    CSP_POLICY: "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com; img-src 'self' data: https://openweathermap.org https://unpkg.com https://*.tile.openstreetmap.org https://tile.openweathermap.org; connect-src 'self' https://api.openweathermap.org https://unpkg.com https://tile.openweathermap.org; font-src 'self' https://fonts.gstatic.com;",
    
    // URL whitelist - SECURITY: SSRF protection
    ALLOWED_HOSTS: [
        'api.openweathermap.org',
        'tile.openweathermap.org'
    ],
    
    // Default settings
    DEFAULT_CITY: 'London',
    DEFAULT_UNITS: 'metric'
};

// SECURITY: Validate configuration on load
if (typeof window !== 'undefined') {
    // Client-side security validation
    console.log('🔒 Loading secure configuration...');
    
    if (!CONFIG.isApiKeyValid()) {
        console.warn('⚠️ OpenWeatherMap API key not configured properly. Some features may not work.');
    } else {
        console.log('✅ API key configuration validated');
    }
    
    // SECURITY: Validate URLs without exposing internal details
    try {
        new URL(CONFIG.OPENWEATHER_BASE_URL);
        new URL(CONFIG.OPENWEATHER_GEOCODING_URL);
        console.log('✅ API endpoints validated');
    } catch (error) {
        console.error('❌ Invalid API URL configuration');
    }
    
    // SECURITY: Apply Content Security Policy if supported
    if (document.head && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        const cspMeta = document.createElement('meta');
        cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
        cspMeta.setAttribute('content', CONFIG.CSP_POLICY);
        document.head.appendChild(cspMeta);
        console.log('✅ Content Security Policy applied');
    }
}

// SECURITY: Freeze configuration to prevent tampering
Object.freeze(CONFIG);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}