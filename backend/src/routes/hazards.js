const express = require('express');
const router = express.Router();
const Hazard = require('../../models/Hazard');
const Alert = require('../../models/Alert');
const Ticket = require('../../models/Ticket');
const { validateHazard, validateLocation } = require('../middleware/validation');
const { authenticateUser } = require('../middleware/auth');
const { processImage } = require('../services/imageProcessing');
const { generateHash } = require('../utils/deduplication');

// GET /api/hazards - Get hazards with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radius = 1, // km
      type,
      severity,
      status = 'active',
      limit = 50,
      offset = 0,
      sortBy = 'detectedAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {};

    // Location-based filtering
    if (lat && lng) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert to meters
        }
      };
    }

    // Type filtering
    if (type) {
      query.type = { $in: type.split(',') };
    }

    // Severity filtering
    if (severity) {
      query.severity = { $in: severity.split(',') };
    }

    // Status filtering
    if (status) {
      query.status = { $in: status.split(',') };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const hazards = await Hazard.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('tickets', 'ticketId status priority')
      .lean();

    const total = await Hazard.countDocuments(query);

    res.json({
      success: true,
      data: {
        hazards,
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

// GET /api/hazards/:id - Get specific hazard
router.get('/:id', async (req, res, next) => {
  try {
    const hazard = await Hazard.findById(req.params.id)
      .populate('tickets', 'ticketId status priority submittedAt')
      .lean();

    if (!hazard) {
      return res.status(404).json({
        success: false,
        message: 'Hazard not found'
      });
    }

    res.json({
      success: true,
      data: hazard
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/hazards - Create new hazard (from AI detection or user report)
router.post('/', validateHazard, async (req, res, next) => {
  try {
    const hazardData = req.body;
    
    // Generate hash for deduplication
    const hash = generateHash(hazardData);
    
    // Check for existing hazard with same hash
    const existingHazard = await Hazard.findOne({ hash });
    if (existingHazard) {
      return res.status(409).json({
        success: false,
        message: 'Similar hazard already exists',
        data: { existingHazardId: existingHazard._id }
      });
    }

    // Process image for privacy if provided
    if (hazardData.detectionData?.cameraData?.imageUrl) {
      try {
        const processedImageUrl = await processImage(hazardData.detectionData.cameraData.imageUrl);
        hazardData.detectionData.cameraData.processedImageUrl = processedImageUrl;
      } catch (error) {
        console.warn('Image processing failed:', error.message);
      }
    }

    // Create hazard
    const hazard = new Hazard({
      ...hazardData,
      hash
    });

    await hazard.save();

    // Create alert for high/medium severity hazards
    if (['high', 'critical'].includes(hazard.severity)) {
      try {
        const alert = await Alert.createHazardAlert(
          req.user?.id || 'system',
          hazard,
          { lat: hazard.location.coordinates[1], lng: hazard.location.coordinates[0] }
        );
        await alert.save();

        // Emit real-time update
        const io = req.app.get('io');
        io.emit('new-hazard', {
          hazard: hazard.toObject(),
          alert: alert.toObject()
        });
      } catch (alertError) {
        console.warn('Alert creation failed:', alertError.message);
      }
    }

    // Auto-create ticket for critical hazards
    if (hazard.severity === 'critical') {
      try {
        const ticket = await Ticket.createFromHazard(hazard);
        await ticket.save();
        
        hazard.tickets.push(ticket._id);
        await hazard.save();
      } catch (ticketError) {
        console.warn('Ticket creation failed:', ticketError.message);
      }
    }

    res.status(201).json({
      success: true,
      data: hazard
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/hazards/:id - Update hazard
router.put('/:id', authenticateUser, async (req, res, next) => {
  try {
    const updates = req.body;
    delete updates.hash; // Prevent hash modification
    delete updates._id;

    const hazard = await Hazard.findByIdAndUpdate(
      req.params.id,
      { ...updates, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!hazard) {
      return res.status(404).json({
        success: false,
        message: 'Hazard not found'
      });
    }

    res.json({
      success: true,
      data: hazard
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/hazards/:id/feedback - Add user feedback
router.post('/:id/feedback', authenticateUser, async (req, res, next) => {
  try {
    const { type, comment } = req.body;
    
    if (!['confirmed', 'false_positive', 'fixed', 'still_exists'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback type'
      });
    }

    const hazard = await Hazard.findById(req.params.id);
    if (!hazard) {
      return res.status(404).json({
        success: false,
        message: 'Hazard not found'
      });
    }

    // Add feedback
    hazard.feedback.reports.push({
      userId: req.user.id,
      type,
      comment,
      timestamp: new Date()
    });

    // Update vote counts
    if (type === 'confirmed' || type === 'still_exists') {
      hazard.feedback.upvotes += 1;
    } else if (type === 'false_positive') {
      hazard.feedback.downvotes += 1;
    }

    // Update status based on feedback
    if (type === 'fixed') {
      hazard.status = 'fixed';
    } else if (type === 'false_positive') {
      hazard.status = 'false_positive';
    }

    await hazard.save();

    res.json({
      success: true,
      data: hazard
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/hazards/:id/vote - Vote on hazard
router.post('/:id/vote', authenticateUser, async (req, res, next) => {
  try {
    const { vote } = req.body; // 'up' or 'down'
    
    if (!['up', 'down'].includes(vote)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote type'
      });
    }

    const hazard = await Hazard.findById(req.params.id);
    if (!hazard) {
      return res.status(404).json({
        success: false,
        message: 'Hazard not found'
      });
    }

    // Update vote counts
    if (vote === 'up') {
      hazard.feedback.upvotes += 1;
    } else {
      hazard.feedback.downvotes += 1;
    }

    await hazard.save();

    res.json({
      success: true,
      data: {
        upvotes: hazard.feedback.upvotes,
        downvotes: hazard.feedback.downvotes
      }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/hazards/:id - Delete hazard (admin only)
router.delete('/:id', authenticateUser, async (req, res, next) => {
  try {
    // Check if user is admin (implement your admin check logic)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const hazard = await Hazard.findByIdAndDelete(req.params.id);
    if (!hazard) {
      return res.status(404).json({
        success: false,
        message: 'Hazard not found'
      });
    }

    res.json({
      success: true,
      message: 'Hazard deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/hazards/stats/summary - Get hazard statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    let matchQuery = {};
    if (lat && lng) {
      matchQuery['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      };
    }

    const stats = await Hazard.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byType: {
            $push: {
              type: '$type',
              severity: '$severity'
            }
          },
          bySeverity: {
            $push: '$severity'
          },
          avgConfidence: { $avg: '$confidence' },
          recentCount: {
            $sum: {
              $cond: [
                { $gte: ['$detectedAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      byType: [],
      bySeverity: [],
      avgConfidence: 0,
      recentCount: 0
    };

    // Process type and severity breakdowns
    const typeBreakdown = {};
    const severityBreakdown = {};

    result.byType.forEach(item => {
      if (!typeBreakdown[item.type]) {
        typeBreakdown[item.type] = { low: 0, medium: 0, high: 0, critical: 0 };
      }
      typeBreakdown[item.type][item.severity] = (typeBreakdown[item.type][item.severity] || 0) + 1;
    });

    result.bySeverity.forEach(severity => {
      severityBreakdown[severity] = (severityBreakdown[severity] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: result.total,
        recent24h: result.recentCount,
        averageConfidence: Math.round(result.avgConfidence * 100) / 100,
        byType: typeBreakdown,
        bySeverity: severityBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
