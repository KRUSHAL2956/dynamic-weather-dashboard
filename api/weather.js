export default async function handler(req, res) {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }
    
    const { city, lat, lon, type = 'weather' } = req.query;
    
    try {
        let url;
        const endpoint = type === 'forecast' ? 'forecast' : 'weather';
        
        if (lat && lon) {
            url = `https://api.openweathermap.org/data/2.5/${endpoint}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        } else if (city) {
            url = `https://api.openweathermap.org/data/2.5/${endpoint}?q=${city}&appid=${API_KEY}&units=metric`;
        } else {
            return res.status(400).json({ error: 'City or coordinates required' });
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
}