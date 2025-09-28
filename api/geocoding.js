export default async function handler(req, res) {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }
    
    const { q, limit = 5 } = req.query;
    
    if (!q || q.length < 2) {
        return res.json([]);
    }
    
    try {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)},IN&limit=${limit}&appid=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json(data);
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch city data' });
    }
}