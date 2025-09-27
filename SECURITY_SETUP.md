# 🔒 Secure Setup Instructions

## ⚠️ IMPORTANT SECURITY NOTICE
This repository previously contained exposed API keys. All sensitive files have been removed and the repository has been cleaned.

## 🔑 API Key Setup

### Step 1: Get Your New API Key
1. Visit [OpenWeatherMap API](https://openweathermap.org/api)
2. Sign up or log into your account
3. **IMPORTANT**: If you had the old key `aab8d6550aa364e3cd595e9bd2c9de8a`, DELETE it immediately
4. Generate a NEW API key

### Step 2: Configure Your Application
```bash
# Copy the template to create your config
cp js/config-template.js js/config.js

# Edit js/config.js and replace YOUR_API_KEY_HERE with your NEW key
```

### Step 3: Verify Security
- ✅ `js/config.js` is in `.gitignore` (never committed)
- ✅ Only use your NEW API key (old one should be deleted)
- ✅ Never commit API keys to version control

## 🚀 Running the Application
```bash
# Start local server
python3 -m http.server 8000

# Open in browser
http://localhost:8000
```

## 🛡️ Security Best Practices
- **Never commit** `js/config.js` to Git
- **Regularly rotate** your API keys
- **Use environment variables** in production
- **Monitor** for security alerts

**Your repository is now secure! 🔐**