const mongoose = require('mongoose');

const hazardSchema = new mongoose.Schema({
  // Location data
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    address: String,
    city: String,
    state: String,
    country: String
  },
  
  // Hazard details
  type: {
    type: String,
    enum: ['pothole', 'debris', 'speed_breaker', 'stalled_vehicle', 'construction', 'flooding', 'other'],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  
  // Detection data
  detectionData: {
    cameraData: {
      imageUrl: String,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      processedImageUrl: String // After privacy blur
    },
    accelerometerData: {
      x: Number,
      y: Number,
      z: Number,
      magnitude: Number
    },
    audioData: {
      decibelLevel: Number,
      frequency: Number,
      duration: Number
    },
    sensorFusion: {
      combinedScore: Number,
      detectionMethod: String
    }
  },
  
  // Vehicle context
  vehicleContext: {
    speed: Number, // km/h
    vehicleType: {
      type: String,
      enum: ['bike', 'car', 'truck', 'bus', 'unknown']
    },
    direction: Number, // degrees
    timestamp: Date
  },
  
  // Status and lifecycle
  status: {
    type: String,
    enum: ['active', 'reported', 'in_progress', 'fixed', 'false_positive'],
    default: 'active'
  },
  
  // User feedback
  feedback: {
    reports: [{
      userId: String,
      type: {
        type: String,
        enum: ['confirmed', 'false_positive', 'fixed', 'still_exists']
      },
      comment: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    }
  },
  
  // Auto-generated fields
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Deduplication
  hash: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Related tickets
  tickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }]
}, {
  timestamps: true
});

// Indexes for performance
hazardSchema.index({ 'location.coordinates': '2dsphere' });
hazardSchema.index({ type: 1, severity: 1 });
hazardSchema.index({ detectedAt: -1 });
hazardSchema.index({ status: 1 });
hazardSchema.index({ hash: 1 });

// Virtual for risk score calculation
hazardSchema.virtual('riskScore').get(function() {
  const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
  const confidenceWeight = this.confidence || 0.5;
  const feedbackWeight = (this.feedback.upvotes - this.feedback.downvotes) / 10;
  
  return (severityWeights[this.severity] * confidenceWeight) + feedbackWeight;
});

// Method to check if hazard is near a location
hazardSchema.methods.isNear = function(lat, lng, radiusKm = 0.1) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat - this.location.coordinates[1]) * Math.PI / 180;
  const dLng = (lng - this.location.coordinates[0]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.location.coordinates[1] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance <= radiusKm;
};

// Method to generate hash for deduplication
hazardSchema.methods.generateHash = function() {
  const crypto = require('crypto');
  const data = `${this.type}-${this.location.coordinates[0]}-${this.location.coordinates[1]}-${Math.floor(this.detectedAt.getTime() / (1000 * 60 * 5))}`; // 5-minute window
  return crypto.createHash('md5').update(data).digest('hex');
};

// Pre-save middleware
hazardSchema.pre('save', function(next) {
  if (!this.hash) {
    this.hash = this.generateHash();
  }
  this.lastUpdated = new Date();
  next();
});

// Static method to find nearby hazards
hazardSchema.statics.findNearby = function(lat, lng, radiusKm = 1, limit = 50) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        $maxDistance: radiusKm * 1000 // Convert to meters
      }
    },
    status: { $in: ['active', 'reported', 'in_progress'] }
  }).limit(limit).sort({ detectedAt: -1 });
};

module.exports = mongoose.model('Hazard', hazardSchema);
