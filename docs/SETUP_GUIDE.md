# 🚀 Complete Setup Guide

This guide will walk you through setting up the complete AI-based road hazard detection system.

## 📋 Prerequisites

### System Requirements
- **Operating System:** Windows 10+, macOS 10.15+, or Ubuntu 18.04+
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 10GB free space
- **Internet:** Stable connection for downloading dependencies

### Software Requirements
- **Node.js:** Version 16.0 or higher
- **npm:** Version 7.0 or higher (comes with Node.js)
- **Python:** Version 3.8 or higher
- **pip:** Latest version
- **MongoDB:** Version 4.4 or higher
- **Git:** Latest version

### Mobile Development
- **Expo CLI:** `npm install -g @expo/cli`
- **Android Studio:** For Android development
- **Xcode:** For iOS development (macOS only)

## 🔧 Installation Steps

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd hackathon
```

### Step 2: Backend Setup

#### 2.1 Install Dependencies
```bash
cd backend
npm install
```

#### 2.2 Environment Configuration
```bash
cp env.example .env
```

Edit the `.env` file with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/hazard-detection

# Google APIs (Get these from Google Cloud Console)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
GOOGLE_TTS_API_KEY=your_google_tts_api_key_here

# External APIs
FIXMYSTREET_API_KEY=your_fixmystreet_api_key_here
FIXMYSTREET_BASE_URL=https://www.fixmystreet.com/api

# JWT Secret (Generate a secure random string)
JWT_SECRET=your_jwt_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# AI Engine
AI_ENGINE_URL=http://localhost:5000
AI_CONFIDENCE_THRESHOLD=0.7
```

#### 2.3 Start MongoDB
```bash
# On Windows
net start MongoDB

# On macOS (if installed via Homebrew)
brew services start mongodb-community

# On Ubuntu
sudo systemctl start mongod
```

#### 2.4 Start Backend Server
```bash
npm run dev
```

The backend will be available at `http://localhost:3000`

### Step 3: AI Engine Setup

#### 3.1 Create Virtual Environment (Recommended)
```bash
cd ai-engine
python -m venv venv

# Activate virtual environment
# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

#### 3.2 Install Dependencies
```bash
pip install -r requirements.txt
```

#### 3.3 Download AI Models
```bash
# Create models directory
mkdir models

# Download YOLOv8 model (this will be done automatically on first run)
# The model will be downloaded to models/yolov8n.pt
```

#### 3.4 Start AI Engine
```bash
python -m src.app
```

The AI engine will be available at `http://localhost:5000`

### Step 4: Mobile App Setup

#### 4.1 Install Dependencies
```bash
cd mobile-app
npm install
```

#### 4.2 Configure Backend URL
Edit `src/services/ApiService.js` and update the baseURL:
```javascript
this.baseURL = 'http://YOUR_BACKEND_IP:3000/api';
```

For local development, use your computer's IP address instead of localhost.

#### 4.3 Start Development Server
```bash
npx expo start
```

#### 4.4 Install Expo Go App
- **Android:** Download from Google Play Store
- **iOS:** Download from App Store

#### 4.5 Connect to App
- Scan the QR code with Expo Go app
- Or press 'a' for Android emulator
- Or press 'i' for iOS simulator

## 🔑 API Keys Setup

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Directions API
4. Create credentials (API Key)
5. Restrict the API key to your domain/IP

### Google Text-to-Speech API
1. In the same Google Cloud project
2. Enable Cloud Text-to-Speech API
3. Use the same API key or create a new one

### FixMyStreet API (Optional)
1. Register at [FixMyStreet](https://www.fixmystreet.com/)
2. Get API credentials
3. Add to backend .env file

## 🧪 Testing the Setup

### Backend Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2023-10-19T10:30:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### AI Engine Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2023-10-19T10:30:00.000Z",
  "version": "1.0.0",
  "components": {
    "hazard_detector": true,
    "privacy_filter": true,
    "sensor_fusion": true,
    "model_manager": true
  }
}
```

### Mobile App Test
1. Open the app in Expo Go
2. Check if the home screen loads
3. Verify location permission is requested
4. Test camera access

## 🐛 Troubleshooting

### Common Issues

#### Backend Issues
**MongoDB Connection Error:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod
```

**Port Already in Use:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### AI Engine Issues
**Python Dependencies Error:**
```bash
# Upgrade pip
pip install --upgrade pip

# Install dependencies one by one
pip install tensorflow==2.13.0
pip install opencv-python==4.8.1.78
pip install ultralytics==8.0.196
```

**Model Download Issues:**
```bash
# Manually download YOLOv8 model
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt -O models/yolov8n.pt
```

#### Mobile App Issues
**Expo CLI Not Found:**
```bash
npm install -g @expo/cli
```

**Metro Bundler Issues:**
```bash
# Clear cache
npx expo start --clear

# Reset Metro cache
npx react-native start --reset-cache
```

**Network Connection Issues:**
- Ensure all devices are on the same network
- Check firewall settings
- Use IP address instead of localhost

### Performance Optimization

#### Backend
- Use PM2 for production: `npm install -g pm2`
- Enable MongoDB indexing
- Use Redis for caching (optional)

#### AI Engine
- Use GPU acceleration if available
- Optimize model quantization
- Implement model caching

#### Mobile App
- Enable Hermes engine
- Optimize image loading
- Implement proper error boundaries

## 🚀 Production Deployment

### Backend Deployment
1. Set up MongoDB Atlas or cloud database
2. Configure environment variables
3. Deploy to Heroku, AWS, or DigitalOcean
4. Set up SSL certificates
5. Configure domain and DNS

### AI Engine Deployment
1. Create Docker container
2. Deploy to cloud platform
3. Set up auto-scaling
4. Configure load balancing

### Mobile App Deployment
1. Build production APK/IPA
2. Test on real devices
3. Submit to app stores
4. Set up crash reporting
5. Configure analytics

## 📱 Device-Specific Setup

### Android
1. Enable Developer Options
2. Enable USB Debugging
3. Install Android Studio
4. Set up Android SDK
5. Create virtual device

### iOS
1. Install Xcode
2. Set up Apple Developer Account
3. Configure signing certificates
4. Set up iOS simulator

## 🔒 Security Considerations

1. **API Keys:** Never commit API keys to version control
2. **Database:** Use strong passwords and enable authentication
3. **HTTPS:** Always use HTTPS in production
4. **Input Validation:** Validate all user inputs
5. **Rate Limiting:** Implement proper rate limiting
6. **CORS:** Configure CORS properly
7. **Dependencies:** Keep dependencies updated

## 📊 Monitoring and Logging

### Backend Monitoring
- Use PM2 monitoring
- Set up error tracking (Sentry)
- Configure log aggregation
- Monitor database performance

### AI Engine Monitoring
- Monitor model performance
- Track inference times
- Set up alerting for failures
- Monitor resource usage

### Mobile App Monitoring
- Use Expo Analytics
- Set up crash reporting
- Monitor app performance
- Track user engagement

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Search existing GitHub issues
4. Create a new issue with:
   - Operating system
   - Node.js version
   - Python version
   - Error messages
   - Steps to reproduce

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [TensorFlow Lite Documentation](https://www.tensorflow.org/lite)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)

---

**Happy coding! 🎉**
