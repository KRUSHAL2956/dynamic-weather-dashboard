export default async function handler(req, res) {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured' });
    }
    
    try {
        // Extract and validate query parameters
        const { layer = 'precipitation_new', z, x, y } = req.query;
        
        if (!z || !x || !y) {
            return res.status(400).json({ error: 'Missing required tile coordinates' });
        }
        
        // Construct the OpenWeatherMap tile URL
        const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${API_KEY}`;
        
        // Fetch the tile from OpenWeatherMap
        const response = await fetch(tileUrl);
        
        if (!response.ok) {
            return res.status(response.status).json({ 
                error: `Error fetching weather tile: ${response.statusText}` 
            });
        }
        
        // Get the image data as buffer
        const buffer = await response.arrayBuffer();
        
        // Set content type for PNG image
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
        
        // Send the image data
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error fetching weather tile:', error);
        return res.status(500).json({ error: 'Failed to fetch weather tile' });
    }
}