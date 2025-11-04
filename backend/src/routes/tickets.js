const express = require('express');
const router = express.Router();
const Ticket = require('../../models/Ticket');
const Hazard = require('../../models/Hazard');
const { validateTicket } = require('../middleware/validation');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const { syncWithExternalSystem } = require('../services/externalIntegration');

// GET /api/tickets - Get tickets with filtering
router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radius = 5,
      status,
      priority,
      issueType,
      assignedTo,
      limit = 20,
      offset = 0,
      sortBy = 'submittedAt',
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
          $maxDistance: parseFloat(radius) * 1000
        }
      };
    }

    // Status filtering
    if (status) {
      query.status = { $in: status.split(',') };
    }

    // Priority filtering
    if (priority) {
      query.priority = { $in: priority.split(',') };
    }

    // Issue type filtering
    if (issueType) {
      query.issueType = { $in: issueType.split(',') };
    }

    // Assignment filtering
    if (assignedTo) {
      query['assignedTo.department'] = assignedTo;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tickets = await Ticket.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('hazardId', 'type severity confidence location detectedAt')
      .lean();

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      data: {
        tickets,
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

// GET /api/tickets/:id - Get specific ticket
router.get('/:id', authenticateUser, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('hazardId')
      .lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets - Create new ticket
router.post('/', validateTicket, authenticateUser, async (req, res, next) => {
  try {
    const ticketData = {
      ...req.body,
      submittedBy: req.user.id
    };

    const ticket = new Ticket(ticketData);
    await ticket.save();

    // Auto-sync with external systems for high priority tickets
    if (['high', 'urgent'].includes(ticket.priority)) {
      try {
        await syncWithExternalSystem(ticket);
      } catch (syncError) {
        console.warn('External sync failed:', syncError.message);
      }
    }

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/from-hazard/:hazardId - Create ticket from hazard
router.post('/from-hazard/:hazardId', authenticateUser, async (req, res, next) => {
  try {
    const hazard = await Hazard.findById(req.params.hazardId);
    if (!hazard) {
      return res.status(404).json({
        success: false,
        message: 'Hazard not found'
      });
    }

    const ticket = await Ticket.createFromHazard(hazard, {
      submittedBy: req.user.id,
      ...req.body
    });

    await ticket.save();

    // Update hazard with ticket reference
    hazard.tickets.push(ticket._id);
    await hazard.save();

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tickets/:id - Update ticket
router.put('/:id', authenticateUser, async (req, res, next) => {
  try {
    const updates = req.body;
    delete updates._id;
    delete updates.ticketId;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { ...updates, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/assign - Assign ticket
router.post('/:id/assign', requireAdmin, async (req, res, next) => {
  try {
    const { department, contractor, contactPerson, contactPhone, contactEmail } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const assignment = {
      department,
      contractor,
      contactPerson,
      contactPhone,
      contactEmail
    };

    await ticket.assign(assignment, req.user.id);

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/update-status - Update ticket status
router.post('/:id/update-status', authenticateUser, async (req, res, next) => {
  try {
    const { status, comment } = req.body;

    if (!['submitted', 'acknowledged', 'assigned', 'in_progress', 'completed', 'rejected', 'duplicate'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.updateStatus(status, req.user.id, comment);

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/feedback - Add feedback to ticket
router.post('/:id/feedback', authenticateUser, async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await ticket.save();

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/sync - Sync with external system
router.post('/:id/sync', requireAdmin, async (req, res, next) => {
  try {
    const { system } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const result = await syncWithExternalSystem(ticket, system);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tickets/stats/summary - Get ticket statistics
router.get('/stats/summary', authenticateUser, async (req, res, next) => {
  try {
    const { days = 30, department } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    let matchQuery = {
      submittedAt: { $gte: startDate }
    };

    if (department) {
      matchQuery['assignedTo.department'] = department;
    }

    const stats = await Ticket.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byStatus: {
            $push: '$status'
          },
          byPriority: {
            $push: '$priority'
          },
          byType: {
            $push: '$issueType'
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $subtract: ['$lastUpdated', '$submittedAt'] },
                null
              ]
            }
          },
          withFeedback: {
            $sum: {
              $cond: [{ $ne: ['$feedback.rating', null] }, 1, 0]
            }
          },
          avgRating: {
            $avg: '$feedback.rating'
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      byStatus: [],
      byPriority: [],
      byType: [],
      avgResolutionTime: 0,
      withFeedback: 0,
      avgRating: 0
    };

    // Process breakdowns
    const statusBreakdown = {};
    const priorityBreakdown = {};
    const typeBreakdown = {};

    result.byStatus.forEach(status => {
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    result.byPriority.forEach(priority => {
      priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
    });

    result.byType.forEach(type => {
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: result.total,
        byStatus: statusBreakdown,
        byPriority: priorityBreakdown,
        byType: typeBreakdown,
        avgResolutionTimeHours: result.avgResolutionTime ? 
          Math.round(result.avgResolutionTime / (1000 * 60 * 60) * 100) / 100 : 0,
        feedbackRate: result.total > 0 ? (result.withFeedback / result.total) * 100 : 0,
        avgRating: Math.round(result.avgRating * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tickets/sla/overdue - Get overdue tickets
router.get('/sla/overdue', requireAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    
    const overdueTickets = await Ticket.find({
      status: { $in: ['submitted', 'acknowledged', 'assigned', 'in_progress'] },
      $or: [
        {
          'sla.responseTime': { $exists: true },
          submittedAt: { $lt: new Date(now.getTime() - 8 * 60 * 60 * 1000) }, // 8 hours ago
          status: 'submitted'
        },
        {
          'sla.resolutionTime': { $exists: true },
          submittedAt: { $lt: new Date(now.getTime() - 72 * 60 * 60 * 1000) }, // 72 hours ago
          status: { $in: ['acknowledged', 'assigned', 'in_progress'] }
        }
      ]
    })
    .populate('hazardId', 'type severity location')
    .sort({ submittedAt: 1 })
    .lean();

    res.json({
      success: true,
      data: overdueTickets
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
