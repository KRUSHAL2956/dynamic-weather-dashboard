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

### 2. Configure
Set your API key as an environment variable:
```bash
export OPENWEATHER_API_KEY="your_api_key_here"
```

### 3. Run
Open `index.html` in your browser or serve via a local web server.

## 🚀 Live Demo

**🌐 Website**: [https://krushal-weather-dashboard.vercel.app/](https://krushal-weather-dashboard.vercel.app/)

## File Structure

```
dynamic-weather-dashboard/
├── index.html
├── css/
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