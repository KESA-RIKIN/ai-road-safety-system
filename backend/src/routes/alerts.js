const express = require('express');
const router = express.Router();
const Alert = require('../../models/Alert');
const Hazard = require('../../models/Hazard');
const { validateAlert, validateLocation } = require('../middleware/validation');
const { authenticateUser, optionalAuth } = require('../middleware/auth');
const { sendPushNotification, sendVoiceAlert } = require('../services/notificationService');

// GET /api/alerts - Get alerts for user
router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radius = 1,
      type,
      priority,
      status = 'active',
      limit = 20,
      offset = 0
    } = req.query;

    let query = {
      userId: req.user.id,
      expiresAt: { $gt: new Date() }
    };

    // Location-based filtering
    if (lat && lng) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      };
    }

    // Type filtering
    if (type) {
      query.type = { $in: type.split(',') };
    }

    // Priority filtering
    if (priority) {
      query.priority = { $in: priority.split(',') };
    }

    // Status filtering
    if (status === 'active') {
      query['interaction.dismissed'] = false;
    } else if (status === 'dismissed') {
      query['interaction.dismissed'] = true;
    }

    const alerts = await Alert.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('hazardId', 'type severity confidence location')
      .lean();

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/:id - Get specific alert
router.get('/:id', authenticateUser, async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('hazardId').lean();

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts - Create new alert
router.post('/', validateAlert, authenticateUser, async (req, res, next) => {
  try {
    const alertData = {
      ...req.body,
      userId: req.user.id
    };

    const alert = new Alert(alertData);
    await alert.save();

    // Send notification if enabled
    if (alert.voiceAlert.enabled) {
      try {
        await sendVoiceAlert(alert, req.user);
      } catch (notificationError) {
        console.warn('Voice alert failed:', notificationError.message);
      }
    }

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`user_${req.user.id}`).emit('new-alert', alert.toObject());

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/:id/acknowledge - Acknowledge alert
router.post('/:id/acknowledge', authenticateUser, async (req, res, next) => {
  try {
    const { action = 'none' } = req.body;

    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await alert.acknowledge(action);

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/:id/dismiss - Dismiss alert
router.post('/:id/dismiss', authenticateUser, async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await alert.dismiss();

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/bulk-dismiss - Dismiss multiple alerts
router.post('/bulk-dismiss', authenticateUser, async (req, res, next) => {
  try {
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Alert IDs array is required'
      });
    }

    const result = await Alert.updateMany(
      {
        _id: { $in: alertIds },
        userId: req.user.id
      },
      {
        $set: {
          'interaction.dismissed': true,
          'interaction.dismissedAt': new Date()
        }
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/nearby - Get nearby alerts for current location
router.get('/nearby', validateLocation, optionalAuth, async (req, res, next) => {
  try {
    const { lat, lng, radius = 0.5 } = req.query;

    const alerts = await Alert.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      },
      expiresAt: { $gt: new Date() },
      'interaction.dismissed': false,
      'delivery.status': { $in: ['sent', 'delivered'] }
    })
    .sort({ priority: -1, createdAt: -1 })
    .limit(10)
    .populate('hazardId', 'type severity confidence')
    .lean();

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/test-voice - Test voice alert
router.post('/test-voice', authenticateUser, async (req, res, next) => {
  try {
    const { message, language = 'en', voice = 'default' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required for voice test'
      });
    }

    const testAlert = {
      message,
      voiceAlert: {
        enabled: true,
        language,
        voice,
        speed: 1.0
      }
    };

    try {
      await sendVoiceAlert(testAlert, req.user);
      res.json({
        success: true,
        message: 'Voice alert sent successfully'
      });
    } catch (voiceError) {
      res.status(500).json({
        success: false,
        message: 'Voice alert failed',
        error: voiceError.message
      });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/stats - Get alert statistics for user
router.get('/stats', authenticateUser, async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const stats = await Alert.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byType: {
            $push: {
              type: '$type',
              priority: '$priority'
            }
          },
          byPriority: {
            $push: '$priority'
          },
          acknowledged: {
            $sum: {
              $cond: ['$interaction.acknowledged', 1, 0]
            }
          },
          dismissed: {
            $sum: {
              $cond: ['$interaction.dismissed', 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      byType: [],
      byPriority: [],
      acknowledged: 0,
      dismissed: 0
    };

    // Process breakdowns
    const typeBreakdown = {};
    const priorityBreakdown = {};

    result.byType.forEach(item => {
      if (!typeBreakdown[item.type]) {
        typeBreakdown[item.type] = { low: 0, medium: 0, high: 0, urgent: 0 };
      }
      typeBreakdown[item.type][item.priority] = (typeBreakdown[item.type][item.priority] || 0) + 1;
    });

    result.byPriority.forEach(priority => {
      priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: result.total,
        acknowledged: result.acknowledged,
        dismissed: result.dismissed,
        acknowledgmentRate: result.total > 0 ? (result.acknowledged / result.total) * 100 : 0,
        byType: typeBreakdown,
        byPriority: priorityBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
