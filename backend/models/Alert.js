const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  // User information
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Alert details
  type: {
    type: String,
    enum: ['hazard_detected', 'route_warning', 'maintenance_update', 'system_alert'],
    required: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    required: true
  },
  
  // Content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Voice/TTS settings
  voiceAlert: {
    enabled: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'te', 'ta', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ur']
    },
    voice: {
      type: String,
      default: 'default'
    },
    speed: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0
    }
  },
  
  // Location context
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    radius: {
      type: Number,
      default: 0.1 // km
    }
  },
  
  // Related data
  hazardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hazard'
  },
  
  routeId: String,
  
  // Alert delivery
  delivery: {
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'dismissed'],
      default: 'pending'
    },
    channels: [{
      type: String,
      enum: ['push', 'sms', 'voice', 'in_app', 'bluetooth']
    }],
    sentAt: Date,
    deliveredAt: Date,
    failureReason: String
  },
  
  // User interaction
  interaction: {
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: Date,
    dismissed: {
      type: Boolean,
      default: false
    },
    dismissedAt: Date,
    actionTaken: {
      type: String,
      enum: ['none', 'route_changed', 'speed_reduced', 'hazard_reported', 'help_requested']
    }
  },
  
  // Timing
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['ai_detection', 'user_report', 'system', 'external_api'],
      default: 'ai_detection'
    },
    confidence: Number,
    tags: [String],
    customData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ 'location.coordinates': '2dsphere' });
alertSchema.index({ type: 1, priority: 1 });
alertSchema.index({ 'delivery.status': 1 });
alertSchema.index({ scheduledFor: 1 });
alertSchema.index({ expiresAt: 1 });

// Virtual for alert age
alertSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Method to check if alert is still relevant
alertSchema.methods.isRelevant = function() {
  return this.expiresAt > new Date() && 
         !this.interaction.dismissed && 
         this.delivery.status !== 'failed';
};

// Method to mark as delivered
alertSchema.methods.markDelivered = function(channel) {
  this.delivery.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  if (channel && !this.delivery.channels.includes(channel)) {
    this.delivery.channels.push(channel);
  }
  return this.save();
};

// Method to acknowledge alert
alertSchema.methods.acknowledge = function(action = 'none') {
  this.interaction.acknowledged = true;
  this.interaction.acknowledgedAt = new Date();
  this.interaction.actionTaken = action;
  return this.save();
};

// Method to dismiss alert
alertSchema.methods.dismiss = function() {
  this.interaction.dismissed = true;
  this.interaction.dismissedAt = new Date();
  return this.save();
};

// Static method to find active alerts for user
alertSchema.statics.findActiveForUser = function(userId, location = null) {
  const query = {
    userId,
    expiresAt: { $gt: new Date() },
    'interaction.dismissed': false,
    'delivery.status': { $in: ['pending', 'sent', 'delivered'] }
  };
  
  if (location) {
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [location.lng, location.lat]
        },
        $maxDistance: (location.radius || 1) * 1000 // Convert to meters
      }
    };
  }
  
  return this.find(query).sort({ priority: -1, createdAt: -1 });
};

// Static method to create hazard alert
alertSchema.statics.createHazardAlert = function(userId, hazard, userLocation) {
  const severityMessages = {
    low: 'Minor road hazard detected ahead',
    medium: 'Road hazard detected ahead - proceed with caution',
    high: 'Significant road hazard ahead - slow down',
    critical: 'Dangerous road condition ahead - avoid if possible'
  };
  
  const typeMessages = {
    pothole: 'pothole',
    debris: 'debris on road',
    speed_breaker: 'speed breaker',
    stalled_vehicle: 'stalled vehicle',
    construction: 'construction zone',
    flooding: 'flooded area',
    other: 'road hazard'
  };
  
  const distance = hazard.isNear ? 
    Math.round(hazard.isNear(userLocation.lat, userLocation.lng) * 1000) : 
    'nearby';
  
  return new this({
    userId,
    type: 'hazard_detected',
    priority: hazard.severity === 'critical' ? 'urgent' : hazard.severity,
    title: `⚠️ ${severityMessages[hazard.severity]}`,
    message: `${typeMessages[hazard.type]} detected ${distance}m ahead. Confidence: ${Math.round(hazard.confidence * 100)}%`,
    location: {
      type: 'Point',
      coordinates: hazard.location.coordinates,
      radius: 0.2
    },
    hazardId: hazard._id,
    voiceAlert: {
      enabled: true,
      language: 'en'
    },
    metadata: {
      source: 'ai_detection',
      confidence: hazard.confidence,
      tags: [hazard.type, hazard.severity]
    }
  });
};

module.exports = mongoose.model('Alert', alertSchema);
