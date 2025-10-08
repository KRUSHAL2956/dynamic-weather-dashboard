export default async function handler(req, res) {
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Cache-Control Headers
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
    res.setHeader('Vary', 'Accept-Encoding');
    
    // CORS Headers
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8080',
        'https://your-domain.vercel.app'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
        return res.status(500).json({ 
            error: 'API key not configured',
            timestamp: new Date().toISOString()
        });
    }
    
    const { city, lat, lon, type = 'weather' } = req.query;
    
    try {
        // Input validation
        if (!city && (!lat || !lon)) {
            return res.status(400).json({ 
                error: 'Either city name or coordinates (lat, lon) are required',
                timestamp: new Date().toISOString()
            });
        }
        
        // Validate city name if provided
        if (city) {
            const sanitizedCity = city.toString().trim().substring(0, 100);
            if (sanitizedCity.length < 2) {
                return res.status(400).json({ 
                    error: 'City name must be at least 2 characters',
                    timestamp: new Date().toISOString()
                });
            }
            if (!/^[a-zA-Z\s\-'.,()]+$/.test(sanitizedCity)) {
                return res.status(400).json({ 
                    error: 'City name contains invalid characters',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Validate coordinates if provided
        if (lat !== undefined || lon !== undefined) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lon);
            
            if (isNaN(latitude) || latitude < -90 || latitude > 90) {
                return res.status(400).json({ 
                    error: 'Invalid latitude. Must be between -90 and 90',
                    timestamp: new Date().toISOString()
                });
            }
            
            if (isNaN(longitude) || longitude < -180 || longitude > 180) {
                return res.status(400).json({ 
                    error: 'Invalid longitude. Must be between -180 and 180',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Validate type parameter
        const allowedTypes = ['weather', 'forecast'];
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({ 
                error: 'Invalid type. Must be "weather" or "forecast"',
                timestamp: new Date().toISOString()
            });
        }
        
        let url;
        const endpoint = type === 'forecast' ? 'forecast' : 'weather';
        
        if (lat && lon) {
            url = `https://api.openweathermap.org/data/2.5/${endpoint}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}&units=metric`;
        } else if (city) {
            url = `https://api.openweathermap.org/data/2.5/${endpoint}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        }
        
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'WeatherDashboard/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Enhanced error responses
            const errorResponse = {
                error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                status: response.status,
                timestamp: new Date().toISOString()
            };
            
            // Add specific error messages
            if (response.status === 401) {
                errorResponse.error = 'Invalid API key';
            } else if (response.status === 404) {
                errorResponse.error = 'Location not found';
            } else if (response.status === 429) {
                errorResponse.error = 'Rate limit exceeded';
                errorResponse.retryAfter = response.headers.get('Retry-After') || '60';
            }
            
            return res.status(response.status).json(errorResponse);
        }
        
        const data = await response.json();
        
        // Validate response data
        if (!data || typeof data !== 'object') {
            return res.status(502).json({ 
                error: 'Invalid response from weather service',
                timestamp: new Date().toISOString()
            });
        }
        
        // Add response metadata
        const responseData = {
            ...data,
            _metadata: {
                timestamp: new Date().toISOString(),
                source: 'OpenWeatherMap',
                cached: false
            }
        };
        
        res.json(responseData);
        
    } catch (error) {
        console.error('Weather API Error:', error);
        
        // Enhanced error response
        const errorResponse = {
            error: 'Failed to fetch weather data',
            timestamp: new Date().toISOString()
        };
        
        if (error.name === 'AbortError') {
            errorResponse.error = 'Request timeout';
            return res.status(408).json(errorResponse);
        }
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorResponse.error = 'Weather service unavailable';
            return res.status(503).json(errorResponse);
        }
        
        res.status(500).json(errorResponse);
    }
}