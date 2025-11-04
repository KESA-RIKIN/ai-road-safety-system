/**
 * Shared Type Definitions
 * Common types used across frontend and backend
 */

// Hazard Types
export const HAZARD_TYPES = {
  POTHOLE: 'pothole',
  DEBRIS: 'debris',
  SPEED_BREAKER: 'speed_breaker',
  STALLED_VEHICLE: 'stalled_vehicle',
  CONSTRUCTION: 'construction',
  FLOODING: 'flooding',
  OTHER: 'other',
};

// Severity Levels
export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Alert Types
export const ALERT_TYPES = {
  HAZARD_DETECTED: 'hazard_detected',
  ROUTE_WARNING: 'route_warning',
  MAINTENANCE_UPDATE: 'maintenance_update',
  SYSTEM_ALERT: 'system_alert',
};

// Alert Priorities
export const ALERT_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Ticket Status
export const TICKET_STATUS = {
  SUBMITTED: 'submitted',
  ACKNOWLEDGED: 'acknowledged',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  DUPLICATE: 'duplicate',
};

// Vehicle Types
export const VEHICLE_TYPES = {
  BIKE: 'bike',
  CAR: 'car',
  TRUCK: 'truck',
  BUS: 'bus',
  UNKNOWN: 'unknown',
};

// Languages
export const LANGUAGES = {
  ENGLISH: 'en',
  HINDI: 'hi',
  TELUGU: 'te',
  TAMIL: 'ta',
  BENGALI: 'bn',
  GUJARATI: 'gu',
  KANNADA: 'kn',
  MALAYALAM: 'ml',
  MARATHI: 'mr',
  PUNJABI: 'pa',
  URDU: 'ur',
};

// Alert Modes
export const ALERT_MODES = {
  VOICE: 'voice',
  PUSH: 'push',
  SMS: 'sms',
  EMAIL: 'email',
  ALL: 'all',
  NONE: 'none',
};

// Sensor Types
export const SENSOR_TYPES = {
  CAMERA: 'camera',
  ACCELEROMETER: 'accelerometer',
  AUDIO: 'audio',
  GPS: 'gps',
  GYROSCOPE: 'gyroscope',
  MAGNETOMETER: 'magnetometer',
};

// Detection Methods
export const DETECTION_METHODS = {
  YOLO: 'yolo',
  TFLITE: 'tflite',
  ACCELEROMETER: 'accelerometer',
  AUDIO: 'audio',
  FUSION: 'fusion',
};

// External Systems
export const EXTERNAL_SYSTEMS = {
  FIXMYSTREET: 'fixmystreet',
  SMART_CITY: 'smart_city',
  MUNICIPAL_CORP: 'municipal_corp',
  TRAFFIC_POLICE: 'traffic_police',
};

// API Response Status
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Common Response Structure
export const createApiResponse = (success, data = null, message = '', errors = []) => ({
  success,
  data,
  message,
  errors,
  timestamp: new Date().toISOString(),
});

// Hazard Object Structure
export const createHazardObject = (data) => ({
  id: data.id || null,
  type: data.type || HAZARD_TYPES.OTHER,
  severity: data.severity || SEVERITY_LEVELS.LOW,
  confidence: data.confidence || 0.0,
  location: {
    type: 'Point',
    coordinates: data.location?.coordinates || [0, 0],
    address: data.location?.address || '',
    city: data.location?.city || '',
    state: data.location?.state || '',
    country: data.location?.country || 'India',
  },
  detectionData: {
    cameraData: data.detectionData?.cameraData || {},
    accelerometerData: data.detectionData?.accelerometerData || {},
    audioData: data.detectionData?.audioData || {},
    sensorFusion: data.detectionData?.sensorFusion || {},
  },
  vehicleContext: {
    speed: data.vehicleContext?.speed || 0,
    vehicleType: data.vehicleContext?.vehicleType || VEHICLE_TYPES.UNKNOWN,
    direction: data.vehicleContext?.direction || 0,
    timestamp: data.vehicleContext?.timestamp || new Date(),
  },
  status: data.status || 'active',
  feedback: {
    reports: data.feedback?.reports || [],
    upvotes: data.feedback?.upvotes || 0,
    downvotes: data.feedback?.downvotes || 0,
  },
  detectedAt: data.detectedAt || new Date(),
  lastUpdated: data.lastUpdated || new Date(),
});

// Alert Object Structure
export const createAlertObject = (data) => ({
  id: data.id || null,
  userId: data.userId || '',
  type: data.type || ALERT_TYPES.HAZARD_DETECTED,
  priority: data.priority || ALERT_PRIORITIES.MEDIUM,
  title: data.title || '',
  message: data.message || '',
  voiceAlert: {
    enabled: data.voiceAlert?.enabled || true,
    language: data.voiceAlert?.language || LANGUAGES.ENGLISH,
    voice: data.voiceAlert?.voice || 'default',
    speed: data.voiceAlert?.speed || 1.0,
  },
  location: {
    type: 'Point',
    coordinates: data.location?.coordinates || [0, 0],
    radius: data.location?.radius || 0.1,
  },
  hazardId: data.hazardId || null,
  delivery: {
    status: data.delivery?.status || 'pending',
    channels: data.delivery?.channels || [],
    sentAt: data.delivery?.sentAt || null,
    deliveredAt: data.delivery?.deliveredAt || null,
    failureReason: data.delivery?.failureReason || null,
  },
  interaction: {
    acknowledged: data.interaction?.acknowledged || false,
    acknowledgedAt: data.interaction?.acknowledgedAt || null,
    dismissed: data.interaction?.dismissed || false,
    dismissedAt: data.interaction?.dismissedAt || null,
    actionTaken: data.interaction?.actionTaken || 'none',
  },
  scheduledFor: data.scheduledFor || new Date(),
  expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
  metadata: {
    source: data.metadata?.source || 'ai_detection',
    confidence: data.metadata?.confidence || 0.0,
    tags: data.metadata?.tags || [],
    customData: data.metadata?.customData || {},
  },
});

// Sensor Data Structure
export const createSensorData = (data) => ({
  accelerometer: {
    x: data.accelerometer?.x || 0,
    y: data.accelerometer?.y || 0,
    z: data.accelerometer?.z || 0,
    magnitude: data.accelerometer?.magnitude || 0,
    timestamp: data.accelerometer?.timestamp || new Date(),
  },
  audio: {
    decibelLevel: data.audio?.decibelLevel || 0,
    frequency: data.audio?.frequency || 0,
    duration: data.audio?.duration || 0,
    timestamp: data.audio?.timestamp || new Date(),
  },
  location: {
    latitude: data.location?.latitude || 0,
    longitude: data.location?.longitude || 0,
    accuracy: data.location?.accuracy || 0,
    speed: data.location?.speed || 0,
    heading: data.location?.heading || 0,
    timestamp: data.location?.timestamp || new Date(),
  },
  gyroscope: {
    x: data.gyroscope?.x || 0,
    y: data.gyroscope?.y || 0,
    z: data.gyroscope?.z || 0,
    timestamp: data.gyroscope?.timestamp || new Date(),
  },
  magnetometer: {
    x: data.magnetometer?.x || 0,
    y: data.magnetometer?.y || 0,
    z: data.magnetometer?.z || 0,
    timestamp: data.magnetometer?.timestamp || new Date(),
  },
});

// Validation Functions
export const validateHazardType = (type) => {
  return Object.values(HAZARD_TYPES).includes(type);
};

export const validateSeverity = (severity) => {
  return Object.values(SEVERITY_LEVELS).includes(severity);
};

export const validateLanguage = (language) => {
  return Object.values(LANGUAGES).includes(language);
};

export const validateCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  const [lng, lat] = coordinates;
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
};

// Utility Functions
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else {
    return `${distance.toFixed(1)}km`;
  }
};

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    return `${Math.floor(diff / 60000)}m ago`;
  } else if (diff < 86400000) { // Less than 1 day
    return `${Math.floor(diff / 3600000)}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const getSeverityColor = (severity) => {
  const colors = {
    [SEVERITY_LEVELS.LOW]: '#2ecc71',
    [SEVERITY_LEVELS.MEDIUM]: '#f1c40f',
    [SEVERITY_LEVELS.HIGH]: '#f39c12',
    [SEVERITY_LEVELS.CRITICAL]: '#e74c3c',
  };
  return colors[severity] || '#95a5a6';
};

export const getSeverityIcon = (severity) => {
  const icons = {
    [SEVERITY_LEVELS.LOW]: 'checkmark-circle',
    [SEVERITY_LEVELS.MEDIUM]: 'information-circle',
    [SEVERITY_LEVELS.HIGH]: 'alert-circle',
    [SEVERITY_LEVELS.CRITICAL]: 'warning',
  };
  return icons[severity] || 'help-circle';
};
