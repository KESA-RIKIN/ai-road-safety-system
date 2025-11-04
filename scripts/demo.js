/**
 * Demo Script for Hazard Detection System
 * This script demonstrates the complete system functionality
 */

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const AI_ENGINE_URL = 'http://localhost:5000';

// Demo data
const demoHazard = {
  location: {
    type: 'Point',
    coordinates: [77.2090, 28.6139], // Delhi coordinates
    address: 'Connaught Place, New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India'
  },
  type: 'pothole',
  severity: 'high',
  confidence: 0.85,
  detectionData: {
    cameraData: {
      imageUrl: 'https://example.com/hazard-image.jpg',
      boundingBox: {
        x: 100,
        y: 150,
        width: 80,
        height: 60
      }
    },
    accelerometerData: {
      x: 0.5,
      y: -0.2,
      z: 2.8,
      magnitude: 2.9
    },
    audioData: {
      decibelLevel: 85,
      frequency: 120,
      duration: 0.5
    },
    sensorFusion: {
      combinedScore: 0.88,
      detectionMethod: 'multi_modal'
    }
  },
  vehicleContext: {
    speed: 45,
    vehicleType: 'car',
    direction: 180,
    timestamp: new Date()
  }
};

const demoAlert = {
  type: 'hazard_detected',
  priority: 'high',
  title: '⚠️ High Severity Hazard Detected',
  message: 'Pothole detected 150m ahead. Confidence: 85%',
  location: {
    type: 'Point',
    coordinates: [77.2090, 28.6139],
    radius: 0.2
  },
  voiceAlert: {
    enabled: true,
    language: 'en',
    voice: 'default',
    speed: 1.0
  }
};

class DemoRunner {
  constructor() {
    this.results = [];
  }

  async run() {
    console.log('🚀 Starting Hazard Detection System Demo\n');
    
    try {
      // Test backend health
      await this.testBackendHealth();
      
      // Test AI engine health
      await this.testAIEngineHealth();
      
      // Test hazard reporting
      await this.testHazardReporting();
      
      // Test alert creation
      await this.testAlertCreation();
      
      // Test map data
      await this.testMapData();
      
      // Test user management
      await this.testUserManagement();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
    }
  }

  async testBackendHealth() {
    console.log('🔍 Testing Backend Health...');
    
    try {
      const response = await axios.get(`${BACKEND_URL}/health`);
      
      if (response.data.status === 'OK') {
        console.log('✅ Backend is healthy');
        this.results.push({ test: 'Backend Health', status: 'PASS' });
      } else {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      console.log('❌ Backend health check failed:', error.message);
      this.results.push({ test: 'Backend Health', status: 'FAIL', error: error.message });
    }
  }

  async testAIEngineHealth() {
    console.log('🔍 Testing AI Engine Health...');
    
    try {
      const response = await axios.get(`${AI_ENGINE_URL}/health`);
      
      if (response.data.status === 'healthy') {
        console.log('✅ AI Engine is healthy');
        this.results.push({ test: 'AI Engine Health', status: 'PASS' });
      } else {
        throw new Error('AI Engine health check failed');
      }
    } catch (error) {
      console.log('❌ AI Engine health check failed:', error.message);
      this.results.push({ test: 'AI Engine Health', status: 'FAIL', error: error.message });
    }
  }

  async testHazardReporting() {
    console.log('🔍 Testing Hazard Reporting...');
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/hazards`, demoHazard);
      
      if (response.data.success) {
        console.log('✅ Hazard reported successfully');
        this.hazardId = response.data.data._id;
        this.results.push({ test: 'Hazard Reporting', status: 'PASS' });
      } else {
        throw new Error('Hazard reporting failed');
      }
    } catch (error) {
      console.log('❌ Hazard reporting failed:', error.message);
      this.results.push({ test: 'Hazard Reporting', status: 'FAIL', error: error.message });
    }
  }

  async testAlertCreation() {
    console.log('🔍 Testing Alert Creation...');
    
    try {
      const alertData = {
        ...demoAlert,
        hazardId: this.hazardId
      };
      
      const response = await axios.post(`${BACKEND_URL}/api/alerts`, alertData);
      
      if (response.data.success) {
        console.log('✅ Alert created successfully');
        this.alertId = response.data.data._id;
        this.results.push({ test: 'Alert Creation', status: 'PASS' });
      } else {
        throw new Error('Alert creation failed');
      }
    } catch (error) {
      console.log('❌ Alert creation failed:', error.message);
      this.results.push({ test: 'Alert Creation', status: 'FAIL', error: error.message });
    }
  }

  async testMapData() {
    console.log('🔍 Testing Map Data...');
    
    try {
      const response = await axios.get(`${BACKEND_URL}/api/maps/hazards`, {
        params: {
          lat: 28.6139,
          lng: 77.2090,
          radius: 1
        }
      });
      
      if (response.data.success) {
        console.log('✅ Map data retrieved successfully');
        this.results.push({ test: 'Map Data', status: 'PASS' });
      } else {
        throw new Error('Map data retrieval failed');
      }
    } catch (error) {
      console.log('❌ Map data retrieval failed:', error.message);
      this.results.push({ test: 'Map Data', status: 'FAIL', error: error.message });
    }
  }

  async testUserManagement() {
    console.log('🔍 Testing User Management...');
    
    try {
      // Test user registration
      const userData = {
        email: 'demo@example.com',
        password: 'demo123',
        name: 'Demo User',
        phoneNumber: '+91-9876543210'
      };
      
      const response = await axios.post(`${BACKEND_URL}/api/users/register`, userData);
      
      if (response.data.success) {
        console.log('✅ User registration successful');
        this.results.push({ test: 'User Management', status: 'PASS' });
      } else {
        throw new Error('User registration failed');
      }
    } catch (error) {
      console.log('❌ User management failed:', error.message);
      this.results.push({ test: 'User Management', status: 'FAIL', error: error.message });
    }
  }

  async testAIProcessing() {
    console.log('🔍 Testing AI Processing...');
    
    try {
      const aiData = {
        image_url: 'https://example.com/test-image.jpg',
        accelerometer_data: demoHazard.detectionData.accelerometerData,
        audio_data: demoHazard.detectionData.audioData,
        location: demoHazard.location,
        vehicle_context: demoHazard.vehicleContext
      };
      
      const response = await axios.post(`${AI_ENGINE_URL}/detect`, aiData);
      
      if (response.data.success) {
        console.log('✅ AI processing successful');
        this.results.push({ test: 'AI Processing', status: 'PASS' });
      } else {
        throw new Error('AI processing failed');
      }
    } catch (error) {
      console.log('❌ AI processing failed:', error.message);
      this.results.push({ test: 'AI Processing', status: 'FAIL', error: error.message });
    }
  }

  displayResults() {
    console.log('\n📊 Demo Results Summary:');
    console.log('========================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n📈 Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! The system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the configuration and try again.');
    }
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  const demo = new DemoRunner();
  demo.run().catch(console.error);
}

module.exports = DemoRunner;
