# Dynamic Weather Dashboard

A modern, responsive weather dashboard that provides real-time weather information using the OpenWeatherMap API.

## Features

- Real-time weather data with detailed metrics
- 5-day weather forecast
- Location services (GPS or manual search)
- Responsive design for all devices
- Dark/Light theme toggle
- UV index display with color coding

## Setup

### 1. Get API Key
1. Visit [OpenWeatherMap API](https://openweathermap.org/api)
2. Sign up and generate your API key

### 2. Deploy to Vercel

1. Fork or clone this repository to your GitHub account
2. Login to [Vercel](https://vercel.com) and create a new project from your repository
3. During setup, add this environment variable:
   - `OPENWEATHER_API_KEY` = Your OpenWeatherMap API Key
4. Deploy!

### 3. Run Locally

#### For Local Development (without API proxy):
1. Open `index.html` directly in your browser
2. Edit the `js/config.js` file to add your OpenWeatherMap API key:
   ```javascript
   get OPENWEATHER_API_KEY() {
       // For localhost development only
       if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
           return 'YOUR_API_KEY_HERE'; // Replace with your actual API key
       }
       return null; // Production uses serverless proxy
   }
   ```
3. Save and refresh your browser

#### For Production-like Testing:
Simply deploy to Vercel as described above and use the deployed URL

## 🚀 Live Demo

**🌐 Website**: [https://krushal-weather-dashboard.vercel.app/](https://krushal-weather-dashboard.vercel.app/)

## File Structure

```
dynamic-weather-dashboard/
├── index.html
├── api/                 # Serverless functions
│   ├── weather.js
│   └── geocoding.js
├── css/
│   ├── style.css
│   └── responsive.css
├── js/
│   ├── app.js
│   ├── config.js
│   ├── utils.js
│   ├── weather.js
│   └── constants.js
└── README.md
```

## Browser Support

Modern browsers (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)