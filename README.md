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

### 2. Deploy
Deploy to Vercel and set `OPENWEATHER_API_KEY` environment variable in project settings.

### 3. Run
- **Localhost**: Open `index.html` (uses direct API calls)
- **Production**: Deploy to Vercel (uses secure serverless proxy)

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