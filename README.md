# Dynamic Weather Dashboard

A modern, responsive weather dashboard built with HTML, CSS, and JavaScript that provides real-time weather information using the OpenWeatherMap API.

## Features

- **Real-time Weather Data**: Current weather conditions with detailed metrics
- **5-Day Forecast**: Extended weather forecast with daily summaries
- **Hourly Forecast**: 24-hour weather predictions
- **Location Services**: Automatic location detection or manual city search
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Theme**: Toggle between themes for better user experience
- **Caching System**: Efficient data caching to reduce API calls
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Security Features

- **XSS Protection**: All user inputs are sanitized and escaped
- **SSRF Prevention**: URL validation to prevent server-side request forgery
- **Rate Limiting**: Built-in API rate limiting
- **Input Validation**: Comprehensive input validation and sanitization
- **Secure Configuration**: API keys externalized from source code

## Setup Instructions

### 1. Get OpenWeatherMap API Key

1. Visit [OpenWeatherMap API](https://openweathermap.org/api)
2. Sign up for a free account
3. Generate your API key

### 2. Configure the Application

1. Navigate to the project directory
2. Copy the config template: `cp js/config-template.js js/config.js`
3. Open `js/config.js` and replace `YOUR_API_KEY_HERE` with your actual OpenWeatherMap API key:

```javascript
const CONFIG = {
    OPENWEATHER_API_KEY: 'your_actual_api_key_here',
    // ... other settings
};
```

**⚠️ IMPORTANT**: Never commit `config.js` with real API keys to version control!

### 3. Security Considerations

- **Never commit your API key** to version control
- The `js/config.js` file is included in `.gitignore`
- Use `js/config.example.js` as a template
- For production deployment, use environment variables
- Regularly rotate your API keys
- See `SECURITY.md` for detailed security guidelines

### 4. Local Development

1. Clone the repository
2. Configure your API key as described above
3. Open `index.html` in a web browser or serve via a local web server

### 5. Production Deployment

For production deployment:

1. Use environment variables for API keys
2. Implement server-side proxy for API calls
3. Enable HTTPS
4. Configure proper CORS headers
5. Implement additional rate limiting at server level

## File Structure

```
dynamic-weather-dashboard/
├── index.html              # Main HTML file
├── css/
│   ├── style.css          # Main styles
│   └── responsive.css     # Responsive styles
├── js/
│   ├── config.example.js  # Configuration template
│   ├── config.js          # Your config (not in git)
│   ├── utils.js           # Utility functions
│   ├── weather.js         # Weather API handler
│   └── app.js             # Main application logic
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## API Usage

The application uses the following OpenWeatherMap API endpoints:

- Current Weather Data
- 5-Day Weather Forecast
- Geocoding API (for city search)

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all security practices are followed
5. Submit a pull request

## License

This project is part of the IBM Frontend Development Internship program.

## Security Issues

If you discover a security vulnerability, please report it responsibly by contacting the development team directly rather than opening a public issue.# dynamic-weather-dashboard
