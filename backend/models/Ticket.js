const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // Ticket identification
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Source hazard
  hazardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hazard',
    required: true
  },
  
  // Location details
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
    address: String,
    landmark: String,
    city: String,
    state: String,
    pincode: String
  },
  
  // Issue details
  issueType: {
    type: String,
    enum: ['pothole', 'debris', 'speed_breaker', 'stalled_vehicle', 'construction', 'flooding', 'other'],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Media evidence
  evidence: {
    images: [{
      url: String,
      caption: String,
      isProcessed: { type: Boolean, default: false } // Privacy blurred
    }],
    videos: [{
      url: String,
      duration: Number,
      isProcessed: { type: Boolean, default: false }
    }],
    sensorData: {
      accelerometer: mongoose.Schema.Types.Mixed,
      audio: mongoose.Schema.Types.Mixed,
      gps: mongoose.Schema.Types.Mixed
    }
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['submitted', 'acknowledged', 'assigned', 'in_progress', 'completed', 'rejected', 'duplicate'],
    default: 'submitted'
  },
  
  // Assignment and responsibility
  assignedTo: {
    department: String,
    contractor: String,
    contactPerson: String,
    contactPhone: String,
    contactEmail: String
  },
  
  // Timeline
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: String,
    comment: String,
    attachments: [String]
  }],
  
  // External system integration
  externalSystems: [{
    system: {
      type: String,
      enum: ['fixmystreet', 'smart_city_portal', 'municipal_corp', 'traffic_police']
    },
    externalId: String,
    status: String,
    lastSync: Date,
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'not_required']
    }
  }],
  
  // Priority and SLA
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  sla: {
    responseTime: Number, // hours
    resolutionTime: Number, // hours
    actualResponseTime: Number,
    actualResolutionTime: Number
  },
  
  // User feedback
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  },
  
  // Cost and resources
  estimatedCost: Number,
  actualCost: Number,
  resourcesRequired: [String],
  
  // Auto-generated fields
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['ai_detection', 'user_report', 'manual_entry'],
      default: 'ai_detection'
    },
    confidence: Number,
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ hazardId: 1 });
ticketSchema.index({ 'location.coordinates': '2dsphere' });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ submittedAt: -1 });
ticketSchema.index({ 'externalSystems.system': 1, 'externalSystems.externalId': 1 });

// Virtual for ticket age
ticketSchema.virtual('age').get(function() {
  return Date.now() - this.submittedAt.getTime();
});

// Virtual for SLA status
ticketSchema.virtual('slaStatus').get(function() {
  if (!this.sla.responseTime) return 'not_set';
  
  const responseDeadline = new Date(this.submittedAt.getTime() + this.sla.responseTime * 60 * 60 * 1000);
  const now = new Date();
  
  if (this.status === 'submitted' && now > responseDeadline) {
    return 'overdue_response';
  }
  
  if (this.sla.resolutionTime) {
    const resolutionDeadline = new Date(this.submittedAt.getTime() + this.sla.resolutionTime * 60 * 60 * 1000);
    if (['submitted', 'acknowledged', 'assigned', 'in_progress'].includes(this.status) && now > resolutionDeadline) {
      return 'overdue_resolution';
    }
  }
  
  return 'on_track';
});

// Method to update status
ticketSchema.methods.updateStatus = function(newStatus, updatedBy, comment = '') {
  this.status = newStatus;
  this.lastUpdated = new Date();
  
  this.timeline.push({
    status: newStatus,
    updatedBy,
    comment,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to assign ticket
ticketSchema.methods.assign = function(assignment, updatedBy) {
  this.assignedTo = assignment;
  this.updateStatus('assigned', updatedBy, `Assigned to ${assignment.department || assignment.contractor}`);
  return this.save();
};

// Method to sync with external system
ticketSchema.methods.syncWithExternal = function(system, externalId, status) {
  const existingSync = this.externalSystems.find(s => s.system === system);
  
  if (existingSync) {
    existingSync.externalId = externalId;
    existingSync.status = status;
    existingSync.lastSync = new Date();
    existingSync.syncStatus = 'synced';
  } else {
    this.externalSystems.push({
      system,
      externalId,
      status,
      lastSync: new Date(),
      syncStatus: 'synced'
    });
  }
  
  return this.save();
};

// Static method to generate ticket ID
ticketSchema.statics.generateTicketId = function() {
  const prefix = 'HD'; // Hazard Detection
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

// Static method to create from hazard
ticketSchema.statics.createFromHazard = function(hazard, additionalData = {}) {
  const ticketId = this.generateTicketId();
  
  const ticket = new this({
    ticketId,
    hazardId: hazard._id,
    location: hazard.location,
    issueType: hazard.type,
    severity: hazard.severity,
    description: `AI-detected ${hazard.type} at ${hazard.location.address || 'unknown location'}. Confidence: ${Math.round(hazard.confidence * 100)}%`,
    evidence: {
      images: hazard.detectionData.cameraData.imageUrl ? [{
        url: hazard.detectionData.cameraData.imageUrl,
        caption: `Detected ${hazard.type}`,
        isProcessed: !!hazard.detectionData.cameraData.processedImageUrl
      }] : [],
      sensorData: {
        accelerometer: hazard.detectionData.accelerometerData,
        audio: hazard.detectionData.audioData,
        gps: hazard.vehicleContext
      }
    },
    priority: hazard.severity === 'critical' ? 'urgent' : 
              hazard.severity === 'high' ? 'high' : 'medium',
    sla: {
      responseTime: hazard.severity === 'critical' ? 2 : 
                   hazard.severity === 'high' ? 4 : 8,
      resolutionTime: hazard.severity === 'critical' ? 24 : 
                     hazard.severity === 'high' ? 48 : 72
    },
    metadata: {
      source: 'ai_detection',
      confidence: hazard.confidence,
      tags: [hazard.type, hazard.severity, 'auto_generated']
    },
    ...additionalData
  });
  
  return ticket;
};

// Pre-save middleware
ticketSchema.pre('save', function(next) {
  if (!this.ticketId) {
    this.ticketId = this.constructor.generateTicketId();
  }
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
