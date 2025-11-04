const Joi = require('joi');

// Hazard validation schema
const hazardSchema = Joi.object({
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().max(500),
    city: Joi.string().max(100),
    state: Joi.string().max(100),
    country: Joi.string().max(100)
  }).required(),
  
  type: Joi.string().valid(
    'pothole', 'debris', 'speed_breaker', 'stalled_vehicle', 
    'construction', 'flooding', 'other'
  ).required(),
  
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  
  confidence: Joi.number().min(0).max(1).required(),
  
  detectionData: Joi.object({
    cameraData: Joi.object({
      imageUrl: Joi.string().uri(),
      boundingBox: Joi.object({
        x: Joi.number(),
        y: Joi.number(),
        width: Joi.number(),
        height: Joi.number()
      }),
      processedImageUrl: Joi.string().uri()
    }),
    accelerometerData: Joi.object({
      x: Joi.number(),
      y: Joi.number(),
      z: Joi.number(),
      magnitude: Joi.number()
    }),
    audioData: Joi.object({
      decibelLevel: Joi.number(),
      frequency: Joi.number(),
      duration: Joi.number()
    }),
    sensorFusion: Joi.object({
      combinedScore: Joi.number(),
      detectionMethod: Joi.string()
    })
  }),
  
  vehicleContext: Joi.object({
    speed: Joi.number().min(0),
    vehicleType: Joi.string().valid('bike', 'car', 'truck', 'bus', 'unknown'),
    direction: Joi.number().min(0).max(360),
    timestamp: Joi.date()
  }),
  
  status: Joi.string().valid(
    'active', 'reported', 'in_progress', 'fixed', 'false_positive'
  ).default('active')
});

// Location validation schema
const locationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(0.01).max(100).default(1)
});

// Alert validation schema
const alertSchema = Joi.object({
  type: Joi.string().valid(
    'hazard_detected', 'route_warning', 'maintenance_update', 'system_alert'
  ).required(),
  
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required(),
  
  title: Joi.string().max(100).required(),
  
  message: Joi.string().max(500).required(),
  
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    radius: Joi.number().min(0.01).max(10).default(0.1)
  }).required(),
  
  voiceAlert: Joi.object({
    enabled: Joi.boolean().default(true),
    language: Joi.string().valid(
      'en', 'hi', 'te', 'ta', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ur'
    ).default('en'),
    voice: Joi.string().default('default'),
    speed: Joi.number().min(0.5).max(2.0).default(1.0)
  }).default({})
});

// Ticket validation schema
const ticketSchema = Joi.object({
  hazardId: Joi.string().required(),
  
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    address: Joi.string().max(500),
    landmark: Joi.string().max(200),
    city: Joi.string().max(100),
    state: Joi.string().max(100),
    pincode: Joi.string().max(10)
  }).required(),
  
  issueType: Joi.string().valid(
    'pothole', 'debris', 'speed_breaker', 'stalled_vehicle', 
    'construction', 'flooding', 'other'
  ).required(),
  
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  
  description: Joi.string().max(1000).required(),
  
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium')
});

// Feedback validation schema
const feedbackSchema = Joi.object({
  type: Joi.string().valid(
    'confirmed', 'false_positive', 'fixed', 'still_exists'
  ).required(),
  
  comment: Joi.string().max(500)
});

// Vote validation schema
const voteSchema = Joi.object({
  vote: Joi.string().valid('up', 'down').required()
});

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorDetails
      });
    }

    req[property] = value;
    next();
  };
};

// Specific validation middlewares
const validateHazard = validate(hazardSchema);
const validateLocation = validate(locationSchema, 'query');
const validateAlert = validate(alertSchema);
const validateTicket = validate(ticketSchema);
const validateFeedback = validate(feedbackSchema);
const validateVote = validate(voteSchema);

// Custom validation functions
const validateCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  
  const [lng, lat] = coordinates;
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
};

const validateImageUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

const validateConfidence = (confidence) => {
  return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
};

module.exports = {
  validateHazard,
  validateLocation,
  validateAlert,
  validateTicket,
  validateFeedback,
  validateVote,
  validateCoordinates,
  validateImageUrl,
  validateConfidence,
  schemas: {
    hazard: hazardSchema,
    location: locationSchema,
    alert: alertSchema,
    ticket: ticketSchema,
    feedback: feedbackSchema,
    vote: voteSchema
  }
};
