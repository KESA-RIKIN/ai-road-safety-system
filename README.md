# 🚀 AI-Based Road Hazard Detection & Alerts

**Tagline:** "Smarter Roads. Safer Drives. AI That Learns and Protects."

## 📱 Project Overview

A complete mobile app prototype that detects and predicts road hazards (potholes, debris, speed breakers, stalled vehicles) in real-time using camera, accelerometer, and audio data with on-device AI processing.

## 🏗️ Architecture

```
hackathon/
├── mobile-app/          # React Native (Expo) Frontend
├── backend/            # Node.js + Express Backend
├── ai-engine/          # AI Detection Pipeline
├── shared/             # Shared utilities and types
└── docs/              # Documentation and assets
```

## 🧩 Tech Stack

- **Frontend:** React Native (Expo)
- **Backend:** Node.js + Express + MongoDB
- **AI/ML:** TensorFlow Lite, YOLOv8, OpenCV
- **APIs:** Google Maps, Google Places, Google TTS
- **Notifications:** Firebase Cloud Messaging

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+ and pip
- MongoDB (local or cloud)
- Expo CLI (`npm install -g @expo/cli`)
- Android Studio / Xcode (for mobile development)

### 1. Backend Setup
```bash
cd backend
npm install
cp env.example .env
# Edit .env with your configuration
npm run dev
```

### 2. AI Engine Setup
```bash
cd ai-engine
pip install -r requirements.txt
python -m src.app
```

### 3. Mobile App Setup
```bash
cd mobile-app
npm install
npx expo start
```

## ✨ Features

- ✅ Real-time hazard detection (on-device AI)
- ✅ Multi-sensor fusion (camera + accelerometer + audio)
- ✅ Privacy protection (face/license plate blur)
- ✅ Smart voice alerts via Bluetooth
- ✅ Interactive hazard map visualization
- ✅ Auto-repair ticketing system
- ✅ Multi-language support
- ✅ Dynamic rerouting suggestions

## 📱 App Screens

1. **Home/Live Detection** - Camera preview with hazard overlay
2. **Map View** - Color-coded hazard pins
3. **Alerts History** - Recent hazard reports
4. **Garage/Help** - Nearby services
5. **Settings** - Language and alert preferences

## 🔧 Development Status

- [x] Project structure setup
- [x] Backend API development
- [x] AI detection pipeline
- [x] Mobile app UI/UX
- [x] Integration and testing
- [x] Documentation and setup guides

## 📋 API Endpoints

### Hazards
- `GET /api/hazards` - Get hazards with filtering
- `POST /api/hazards` - Report new hazard
- `GET /api/hazards/:id` - Get specific hazard
- `POST /api/hazards/:id/feedback` - Add feedback

### Alerts
- `GET /api/alerts` - Get user alerts
- `POST /api/alerts` - Create alert
- `POST /api/alerts/:id/acknowledge` - Acknowledge alert

### Maps
- `GET /api/maps/hazards` - Get hazards for map
- `GET /api/maps/heatmap` - Get heatmap data
- `GET /api/maps/route` - Get route with hazards

## 🧠 AI Features

- **YOLOv8 Detection:** Real-time object detection
- **TensorFlow Lite:** On-device classification
- **OpenCV:** Image processing and privacy blur
- **Sensor Fusion:** Multi-modal data combination
- **Privacy Protection:** Automatic face/license plate blur

## 🔧 Configuration

### Backend (.env)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hazard-detection
GOOGLE_MAPS_API_KEY=your_key_here
GOOGLE_TTS_API_KEY=your_key_here
```

### Mobile App
Update `mobile-app/src/services/ApiService.js` with your backend URL.

## 📱 Mobile App Features

- **Live Detection:** Real-time camera-based hazard detection
- **Sensor Monitoring:** Accelerometer and audio analysis
- **Voice Alerts:** Bluetooth-enabled voice notifications
- **Interactive Maps:** Google Maps integration with hazard visualization
- **Offline Support:** Local caching and offline functionality

## 🚀 Deployment

### Backend
```bash
cd backend
npm run build
# Deploy to your preferred platform (Heroku, AWS, etc.)
```

### Mobile App
```bash
cd mobile-app
expo build:android  # or expo build:ios
```

### AI Engine
```bash
cd ai-engine
# Deploy as Docker container or serverless function
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- YOLOv8 by Ultralytics
- TensorFlow Lite by Google
- OpenCV community
- React Native and Expo teams
