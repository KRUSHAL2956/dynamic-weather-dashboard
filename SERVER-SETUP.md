# Server Setup for Weather Dashboard

## ⚠️ Important: Server Environment Issues

### Problem
When using **VS Code Live Server** extension to run the weather dashboard, the **24-hour and 5-day forecasts may not display** due to CORS (Cross-Origin Resource Sharing) issues with external API calls to OpenWeatherMap.

### Solution

#### ✅ **Recommended: Use Python HTTP Server**
```bash
cd /path/to/dynamic-weather-dashboard
python3 -m http.server 8000
```
Then visit: **http://localhost:8000**

#### ❌ **Problematic: VS Code Live Server**
- Uses different protocols/ports
- Can cause CORS issues with external API calls
- May show current weather but not forecasts

### Why This Happens

1. **Live Server** typically runs on ports like `5500`, `5501`, etc.
2. **Different origins** can trigger CORS restrictions
3. **OpenWeatherMap API** may block requests from certain origins
4. **Python HTTP server** provides a more standard HTTP server environment

### Detection

The app now automatically detects Live Server and shows a warning banner if potential CORS issues are detected.

### Quick Fix

If you see forecasts not loading:
1. Stop Live Server
2. Open terminal in project directory
3. Run: `python3 -m http.server 8000`
4. Visit: `http://localhost:8000`

### Technical Details

- Current weather API calls usually work fine
- Forecast API calls are more sensitive to CORS
- The issue is related to browser security policies
- Python HTTP server provides a cleaner environment for API requests