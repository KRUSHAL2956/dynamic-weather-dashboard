export default async function handler(req, res) {
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Cache-Control Headers (longer cache for city data)
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=300');
    res.setHeader('Vary', 'Accept-Encoding');
    
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
    
    const { q, limit = 5 } = req.query;
    
    // Input validation
    if (!q || typeof q !== 'string') {
        return res.status(400).json({ 
            error: 'Query parameter "q" is required',
            timestamp: new Date().toISOString()
        });
    }
    
    const sanitizedQuery = q.toString().trim().substring(0, 100);
    
    if (sanitizedQuery.length < 2) {
        return res.json([]);
    }
    
    // Validate query contains only allowed characters
    if (!/^[a-zA-Z\s\-'.,()]+$/.test(sanitizedQuery)) {
        return res.status(400).json({ 
            error: 'Query contains invalid characters',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validate limit parameter
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 10) {
        return res.status(400).json({ 
            error: 'Limit must be between 1 and 10',
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(sanitizedQuery)},IN&limit=${parsedLimit}&appid=${API_KEY}`;
        
        // Add timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'WeatherDashboard/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                timestamp: new Date().toISOString()
            });
        }
        
        const data = await response.json();
        
        // Validate and sanitize response data
        if (!Array.isArray(data)) {
            return res.status(502).json({ 
                error: 'Invalid response from geocoding service',
                timestamp: new Date().toISOString()
            });
        }
        
        // Filter and sanitize city data
        const sanitizedData = data
            .filter(city => city && city.name && city.country)
            .map(city => ({
                name: city.name.substring(0, 100),
                country: city.country.substring(0, 10),
                state: city.state ? city.state.substring(0, 100) : '',
                lat: Number(city.lat),
                lon: Number(city.lon)
            }))
            .slice(0, parsedLimit);
        
        res.json(sanitizedData);
        
    } catch (error) {
        console.error('Geocoding API Error:', error);
        
        const errorResponse = {
            error: 'Failed to fetch city data',
            timestamp: new Date().toISOString()
        };
        
        if (error.name === 'AbortError') {
            errorResponse.error = 'Request timeout';
            return res.status(408).json(errorResponse);
        }
        
        res.status(500).json(errorResponse);
    }
}