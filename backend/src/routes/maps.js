const express = require('express');
const router = express.Router();
const Hazard = require('../../models/Hazard');
const { validateLocation } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');
const { getNearbyPlaces, getRouteAlternatives } = require('../services/mapService');

// GET /api/maps/hazards - Get hazards for map display
router.get('/hazards', validateLocation, async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radius = 2,
      zoom = 10,
      types,
      severities
    } = req.query;

    let query = {
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      },
      status: { $in: ['active', 'reported', 'in_progress'] }
    };

    // Filter by types
    if (types) {
      query.type = { $in: types.split(',') };
    }

    // Filter by severities
    if (severities) {
      query.severity = { $in: severities.split(',') };
    }

    // Adjust limit based on zoom level
    const limit = zoom > 15 ? 100 : zoom > 12 ? 50 : 20;

    const hazards = await Hazard.find(query)
      .limit(limit)
      .sort({ severity: -1, detectedAt: -1 })
      .select('type severity confidence location detectedAt status feedback')
      .lean();

    // Format for map display
    const mapHazards = hazards.map(hazard => ({
      id: hazard._id,
      type: hazard.type,
      severity: hazard.severity,
      confidence: hazard.confidence,
      coordinates: hazard.location.coordinates,
      address: hazard.location.address,
      detectedAt: hazard.detectedAt,
      status: hazard.status,
      upvotes: hazard.feedback?.upvotes || 0,
      downvotes: hazard.feedback?.downvotes || 0,
      riskScore: calculateRiskScore(hazard)
    }));

    res.json({
      success: true,
      data: {
        hazards: mapHazards,
        center: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radius: parseFloat(radius),
        zoom: parseInt(zoom)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/heatmap - Get hazard density heatmap data
router.get('/heatmap', validateLocation, async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radius = 5,
      gridSize = 0.01 // ~1km grid
    } = req.query;

    const bounds = {
      north: parseFloat(lat) + parseFloat(radius),
      south: parseFloat(lat) - parseFloat(radius),
      east: parseFloat(lng) + parseFloat(radius),
      west: parseFloat(lng) - parseFloat(radius)
    };

    // Get all hazards in the area
    const hazards = await Hazard.find({
      'location.coordinates': {
        $geoWithin: {
          $box: [
            [bounds.west, bounds.south],
            [bounds.east, bounds.north]
          ]
        }
      },
      status: { $in: ['active', 'reported', 'in_progress'] }
    }).select('location.coordinates severity confidence').lean();

    // Create grid and count hazards
    const grid = {};
    const gridStep = parseFloat(gridSize);

    hazards.forEach(hazard => {
      const [lng, lat] = hazard.location.coordinates;
      const gridLat = Math.floor(lat / gridStep) * gridStep;
      const gridLng = Math.floor(lng / gridStep) * gridStep;
      const key = `${gridLat},${gridLng}`;

      if (!grid[key]) {
        grid[key] = {
          lat: gridLat + gridStep / 2,
          lng: gridLng + gridStep / 2,
          count: 0,
          severity: { low: 0, medium: 0, high: 0, critical: 0 },
          avgConfidence: 0
        };
      }

      grid[key].count++;
      grid[key].severity[hazard.severity]++;
      grid[key].avgConfidence += hazard.confidence;
    });

    // Calculate averages and format for heatmap
    const heatmapData = Object.values(grid).map(cell => {
      cell.avgConfidence = cell.avgConfidence / cell.count;
      cell.intensity = Math.min(1, cell.count / 10); // Normalize to 0-1
      return cell;
    });

    res.json({
      success: true,
      data: {
        heatmap: heatmapData,
        bounds,
        gridSize: gridStep,
        totalHazards: hazards.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/route - Get route with hazard information
router.get('/route', async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      waypoints,
      avoidHazards = true,
      hazardRadius = 0.1
    } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    // Parse coordinates
    const originCoords = origin.split(',').map(Number);
    const destCoords = destination.split(',').map(Number);

    // Get route from Google Maps API (mock for demo)
    const route = await getRouteAlternatives(originCoords, destCoords, waypoints);

    if (avoidHazards) {
      // Find hazards along the route
      const routeHazards = await findHazardsAlongRoute(route, parseFloat(hazardRadius));
      
      // Calculate route safety score
      const safetyScore = calculateRouteSafety(route, routeHazards);
      
      // Suggest alternative routes if needed
      if (safetyScore < 0.7) {
        const alternatives = await getRouteAlternatives(originCoords, destCoords, waypoints, true);
        route.alternatives = alternatives;
      }

      route.hazards = routeHazards;
      route.safetyScore = safetyScore;
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/places - Get nearby places (garages, fuel stations, etc.)
router.get('/places', validateLocation, async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radius = 2,
      type = 'gas_station,car_repair,hospital,police'
    } = req.query;

    const places = await getNearbyPlaces(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius),
      type.split(',')
    );

    res.json({
      success: true,
      data: places
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/geocode - Geocode address to coordinates
router.get('/geocode', async (req, res, next) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    // Mock geocoding for demo
    const geocoded = {
      address,
      coordinates: [77.2090, 28.6139], // Delhi coordinates as default
      formattedAddress: address,
      placeId: 'mock_place_id',
      types: ['street_address']
    };

    res.json({
      success: true,
      data: geocoded
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maps/reverse-geocode - Reverse geocode coordinates to address
router.get('/reverse-geocode', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Mock reverse geocoding for demo
    const address = {
      coordinates: [parseFloat(lng), parseFloat(lat)],
      formattedAddress: `${lat}, ${lng}`,
      components: {
        street: 'Unknown Street',
        city: 'Unknown City',
        state: 'Unknown State',
        country: 'India',
        postalCode: '000000'
      }
    };

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function calculateRiskScore(hazard) {
  const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
  const confidenceWeight = hazard.confidence || 0.5;
  const feedbackWeight = ((hazard.feedback?.upvotes || 0) - (hazard.feedback?.downvotes || 0)) / 10;
  
  return (severityWeights[hazard.severity] * confidenceWeight) + feedbackWeight;
}

async function findHazardsAlongRoute(route, radius) {
  const hazards = [];
  
  // Sample points along the route
  const routePoints = route.legs.flatMap(leg => 
    leg.steps.map(step => step.end_location)
  );

  for (const point of routePoints) {
    const nearbyHazards = await Hazard.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [point.lng, point.lat]
          },
          $maxDistance: radius * 1000
        }
      },
      status: { $in: ['active', 'reported', 'in_progress'] }
    }).select('type severity confidence location').lean();

    hazards.push(...nearbyHazards);
  }

  return hazards;
}

function calculateRouteSafety(route, hazards) {
  if (hazards.length === 0) return 1.0;

  const totalDistance = route.distance.value; // in meters
  const hazardDensity = hazards.length / (totalDistance / 1000); // hazards per km
  
  // Calculate weighted hazard impact
  const totalImpact = hazards.reduce((sum, hazard) => {
    const severityWeights = { low: 0.1, medium: 0.3, high: 0.6, critical: 1.0 };
    return sum + (severityWeights[hazard.severity] * hazard.confidence);
  }, 0);

  // Convert to safety score (0-1, higher is safer)
  const safetyScore = Math.max(0, 1 - (totalImpact / hazards.length) * 0.5 - hazardDensity * 0.1);
  
  return Math.round(safetyScore * 100) / 100;
}

module.exports = router;
