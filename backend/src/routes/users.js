const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { mockLogin, generateToken } = require('../middleware/auth');

// POST /api/users/login - User login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = mockLogin(email, password);
    
    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/register - User registration
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, phoneNumber } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Mock user creation for demo
    const newUser = {
      id: `user_${Date.now()}`,
      email,
      name,
      phoneNumber,
      isAdmin: false,
      preferences: {
        language: 'en',
        alertMode: 'voice',
        voiceEnabled: true,
        pushNotifications: true,
        smsNotifications: false,
        emailNotifications: false
      },
      createdAt: new Date()
    };

    const token = generateToken(newUser.id);

    res.status(201).json({
      success: true,
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/profile - Get user profile
router.get('/profile', authenticateUser, async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticateUser, async (req, res, next) => {
  try {
    const updates = req.body;
    
    // Remove sensitive fields
    delete updates.id;
    delete updates.isAdmin;
    delete updates.createdAt;

    // Update user object (in real app, this would update database)
    const updatedUser = {
      ...req.user,
      ...updates,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/preferences - Update user preferences
router.put('/preferences', authenticateUser, async (req, res, next) => {
  try {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Preferences object is required'
      });
    }

    // Validate preference values
    const validLanguages = ['en', 'hi', 'te', 'ta', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ur'];
    const validAlertModes = ['voice', 'push', 'sms', 'email', 'all', 'none'];

    if (preferences.language && !validLanguages.includes(preferences.language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language preference'
      });
    }

    if (preferences.alertMode && !validAlertModes.includes(preferences.alertMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert mode preference'
      });
    }

    // Update user preferences
    const updatedUser = {
      ...req.user,
      preferences: {
        ...req.user.preferences,
        ...preferences
      },
      updatedAt: new Date()
    };

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/device-token - Register device for push notifications
router.post('/device-token', authenticateUser, async (req, res, next) => {
  try {
    const { token, platform, appVersion } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Device token is required'
      });
    }

    // In a real app, store device token in database
    const deviceInfo = {
      token,
      platform: platform || 'unknown',
      appVersion: appVersion || '1.0.0',
      registeredAt: new Date(),
      lastActive: new Date()
    };

    res.json({
      success: true,
      data: {
        message: 'Device token registered successfully',
        deviceInfo
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/device-token - Unregister device
router.delete('/device-token', authenticateUser, async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Device token is required'
      });
    }

    // In a real app, remove device token from database
    res.json({
      success: true,
      data: {
        message: 'Device token unregistered successfully'
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/activity - Get user activity history
router.get('/activity', authenticateUser, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    // Mock activity data
    const activities = [
      {
        id: '1',
        type: 'hazard_detected',
        description: 'Detected pothole on Main Street',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        location: { lat: 28.6139, lng: 77.2090 }
      },
      {
        id: '2',
        type: 'alert_received',
        description: 'High severity hazard alert',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        location: { lat: 28.6140, lng: 77.2091 }
      },
      {
        id: '3',
        type: 'feedback_submitted',
        description: 'Confirmed hazard report',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        location: { lat: 28.6141, lng: 77.2092 }
      }
    ];

    res.json({
      success: true,
      data: {
        activities: activities.slice(offset, offset + parseInt(limit)),
        pagination: {
          total: activities.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < activities.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/stats - Get user statistics
router.get('/stats', authenticateUser, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    // Mock user statistics
    const stats = {
      totalHazardsDetected: 15,
      totalAlertsReceived: 23,
      totalFeedbackSubmitted: 8,
      averageResponseTime: 2.5, // minutes
      preferredLanguage: req.user.preferences?.language || 'en',
      alertMode: req.user.preferences?.alertMode || 'voice',
      accountCreated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastActive: new Date(),
      streak: 5, // days
      achievements: [
        {
          id: 'first_detection',
          name: 'First Detection',
          description: 'Detected your first hazard',
          earnedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'feedback_master',
          name: 'Feedback Master',
          description: 'Submitted 5 feedback reports',
          earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }
      ]
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/feedback - Submit app feedback
router.post('/feedback', authenticateUser, async (req, res, next) => {
  try {
    const { type, rating, comment, category } = req.body;

    if (!type || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Type and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const feedback = {
      id: `feedback_${Date.now()}`,
      userId: req.user.id,
      type,
      rating,
      comment,
      category: category || 'general',
      submittedAt: new Date()
    };

    // In a real app, save feedback to database
    console.log('User feedback received:', feedback);

    res.status(201).json({
      success: true,
      data: {
        message: 'Feedback submitted successfully',
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/account - Delete user account
router.delete('/account', authenticateUser, async (req, res, next) => {
  try {
    const { password, confirmDelete } = req.body;

    if (!confirmDelete) {
      return res.status(400).json({
        success: false,
        message: 'Account deletion must be confirmed'
      });
    }

    // In a real app, verify password and delete user data
    console.log(`Account deletion requested for user: ${req.user.id}`);

    res.json({
      success: true,
      data: {
        message: 'Account deletion request submitted. Your account will be deleted within 24 hours.'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
