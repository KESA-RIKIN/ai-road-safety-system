const crypto = require('crypto');

/**
 * Generate a hash for hazard deduplication
 * @param {Object} hazardData - The hazard data object
 * @returns {string} - MD5 hash string
 */
const generateHash = (hazardData) => {
  const {
    type,
    location,
    detectedAt = new Date()
  } = hazardData;

  // Create a time window (5 minutes) for deduplication
  const timeWindow = Math.floor(detectedAt.getTime() / (1000 * 60 * 5));
  
  // Round coordinates to reduce precision for nearby duplicates
  const roundedLat = Math.round(location.coordinates[1] * 1000) / 1000; // ~100m precision
  const roundedLng = Math.round(location.coordinates[0] * 1000) / 1000;
  
  // Create hash string
  const hashString = `${type}-${roundedLat}-${roundedLng}-${timeWindow}`;
  
  return crypto.createHash('md5').update(hashString).digest('hex');
};

/**
 * Check if two hazards are similar (for advanced deduplication)
 * @param {Object} hazard1 - First hazard
 * @param {Object} hazard2 - Second hazard
 * @returns {boolean} - True if hazards are similar
 */
const areHazardsSimilar = (hazard1, hazard2) => {
  // Same type
  if (hazard1.type !== hazard2.type) return false;
  
  // Within 100m distance
  const distance = calculateDistance(
    hazard1.location.coordinates[1], hazard1.location.coordinates[0],
    hazard2.location.coordinates[1], hazard2.location.coordinates[0]
  );
  
  if (distance > 0.1) return false; // 100m threshold
  
  // Within 1 hour time window
  const timeDiff = Math.abs(hazard1.detectedAt - hazard2.detectedAt);
  if (timeDiff > 60 * 60 * 1000) return false; // 1 hour threshold
  
  return true;
};

/**
 * Calculate distance between two coordinates in kilometers
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Find potential duplicates in a list of hazards
 * @param {Array} hazards - Array of hazard objects
 * @returns {Array} - Array of duplicate groups
 */
const findDuplicates = (hazards) => {
  const duplicates = [];
  const processed = new Set();
  
  for (let i = 0; i < hazards.length; i++) {
    if (processed.has(i)) continue;
    
    const group = [hazards[i]];
    processed.add(i);
    
    for (let j = i + 1; j < hazards.length; j++) {
      if (processed.has(j)) continue;
      
      if (areHazardsSimilar(hazards[i], hazards[j])) {
        group.push(hazards[j]);
        processed.add(j);
      }
    }
    
    if (group.length > 1) {
      duplicates.push(group);
    }
  }
  
  return duplicates;
};

/**
 * Merge similar hazards into a single hazard
 * @param {Array} hazards - Array of similar hazards
 * @returns {Object} - Merged hazard object
 */
const mergeHazards = (hazards) => {
  if (hazards.length === 0) return null;
  if (hazards.length === 1) return hazards[0];
  
  // Sort by confidence and detection time
  const sorted = hazards.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence; // Higher confidence first
    }
    return a.detectedAt - b.detectedAt; // Earlier detection first
  });
  
  const primary = sorted[0];
  const merged = { ...primary };
  
  // Merge feedback
  merged.feedback = {
    upvotes: hazards.reduce((sum, h) => sum + (h.feedback?.upvotes || 0), 0),
    downvotes: hazards.reduce((sum, h) => sum + (h.feedback?.downvotes || 0), 0),
    reports: hazards.flatMap(h => h.feedback?.reports || [])
  };
  
  // Update confidence based on multiple detections
  const avgConfidence = hazards.reduce((sum, h) => sum + h.confidence, 0) / hazards.length;
  const confidenceBoost = Math.min(0.1, hazards.length * 0.02); // Small boost for multiple detections
  merged.confidence = Math.min(1, avgConfidence + confidenceBoost);
  
  // Update severity to highest
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
  merged.severity = hazards.reduce((highest, h) => 
    severityOrder[h.severity] > severityOrder[highest] ? h.severity : highest, 'low'
  );
  
  // Add metadata about merge
  merged.metadata = {
    ...merged.metadata,
    mergedFrom: hazards.map(h => h._id),
    mergeCount: hazards.length,
    mergedAt: new Date()
  };
  
  return merged;
};

module.exports = {
  generateHash,
  areHazardsSimilar,
  calculateDistance,
  findDuplicates,
  mergeHazards
};
