const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Hazard Detection Backend is running!'
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API is working!',
    timestamp: new Date().toISOString()
  });
});

// Mock hazards endpoint
app.get('/api/hazards', (req, res) => {
  res.json({
    success: true,
    data: {
      hazards: [
        {
          id: '1',
          type: 'pothole',
          severity: 'high',
          confidence: 0.85,
          location: {
            coordinates: [77.2090, 28.6139],
            address: 'Connaught Place, New Delhi'
          },
          detectedAt: new Date().toISOString()
        }
      ],
      pagination: {
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    }
  });
});

// Mock alerts endpoint
app.get('/api/alerts', (req, res) => {
  res.json({
    success: true,
    data: {
      alerts: [
        {
          id: '1',
          type: 'hazard_detected',
          priority: 'high',
          title: '⚠️ High Severity Hazard Detected',
          message: 'Pothole detected 150m ahead. Confidence: 85%',
          timestamp: new Date().toISOString()
        }
      ],
      pagination: {
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Simple Backend Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📊 Hazards API: http://localhost:${PORT}/api/hazards`);
  console.log(`🔔 Alerts API: http://localhost:${PORT}/api/alerts`);
});

module.exports = app;
