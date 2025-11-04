const axios = require('axios');

// Mock map service for demo purposes
// In a real implementation, this would integrate with:
// - Google Maps API for places and routing
// - OpenStreetMap for alternative mapping
// - Here Maps for additional services

/**
 * Get nearby places using Google Places API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Search radius in km
 * @param {Array} types - Array of place types
 * @returns {Promise<Array>} - Array of nearby places
 */
const getNearbyPlaces = async (lat, lng, radius, types = ['gas_station']) => {
  try {
    console.log(`Finding nearby places at ${lat}, ${lng} within ${radius}km`);
    
    // Mock Google Places API response
    const mockPlaces = [
      {
        placeId: 'place_1',
        name: 'Shell Gas Station',
        type: 'gas_station',
        rating: 4.2,
        priceLevel: 2,
        location: {
          lat: lat + 0.01,
          lng: lng + 0.01
        },
        address: '123 Main Street, City, State',
        phoneNumber: '+1-555-0123',
        openingHours: {
          openNow: true,
          periods: [
            { open: { day: 0, time: '0600' }, close: { day: 0, time: '2200' } }
          ]
        },
        distance: 0.5 // km
      },
      {
        placeId: 'place_2',
        name: 'Auto Repair Center',
        type: 'car_repair',
        rating: 4.5,
        priceLevel: 3,
        location: {
          lat: lat - 0.005,
          lng: lng + 0.015
        },
        address: '456 Service Road, City, State',
        phoneNumber: '+1-555-0456',
        openingHours: {
          openNow: true,
          periods: [
            { open: { day: 1, time: '0800' }, close: { day: 5, time: '1800' } }
          ]
        },
        distance: 0.8
      },
      {
        placeId: 'place_3',
        name: 'City Hospital',
        type: 'hospital',
        rating: 4.0,
        priceLevel: 1,
        location: {
          lat: lat + 0.02,
          lng: lng - 0.01
        },
        address: '789 Health Avenue, City, State',
        phoneNumber: '+1-555-0789',
        openingHours: {
          openNow: true,
          periods: [
            { open: { day: 0, time: '0000' }, close: { day: 6, time: '2359' } }
          ]
        },
        distance: 1.2
      },
      {
        placeId: 'place_4',
        name: 'Police Station',
        type: 'police',
        rating: 3.8,
        priceLevel: 1,
        location: {
          lat: lat - 0.01,
          lng: lng - 0.02
        },
        address: '321 Safety Street, City, State',
        phoneNumber: '+1-555-0321',
        openingHours: {
          openNow: true,
          periods: [
            { open: { day: 0, time: '0000' }, close: { day: 6, time: '2359' } }
          ]
        },
        distance: 1.5
      }
    ];

    // Filter by requested types
    const filteredPlaces = mockPlaces.filter(place => 
      types.includes(place.type)
    );

    // Sort by distance
    filteredPlaces.sort((a, b) => a.distance - b.distance);

    return filteredPlaces;
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    throw new Error('Failed to fetch nearby places');
  }
};

/**
 * Get route alternatives with hazard avoidance
 * @param {Array} origin - [lat, lng] origin coordinates
 * @param {Array} destination - [lat, lng] destination coordinates
 * @param {Array} waypoints - Optional waypoints
 * @param {boolean} avoidHazards - Whether to avoid known hazards
 * @returns {Promise<Object>} - Route information
 */
const getRouteAlternatives = async (origin, destination, waypoints = [], avoidHazards = false) => {
  try {
    console.log(`Getting route from ${origin} to ${destination}`);
    
    // Mock Google Directions API response
    const mockRoute = {
      routes: [
        {
          summary: 'Main Route',
          legs: [
            {
              distance: { text: '5.2 km', value: 5200 },
              duration: { text: '12 mins', value: 720 },
              start_address: 'Origin Address',
              end_address: 'Destination Address',
              steps: [
                {
                  distance: { text: '1.0 km', value: 1000 },
                  duration: { text: '3 mins', value: 180 },
                  start_location: { lat: origin[0], lng: origin[1] },
                  end_location: { lat: origin[0] + 0.01, lng: origin[1] + 0.01 },
                  html_instructions: 'Head north on Main Street',
                  travel_mode: 'DRIVING'
                },
                {
                  distance: { text: '2.1 km', value: 2100 },
                  duration: { text: '5 mins', value: 300 },
                  start_location: { lat: origin[0] + 0.01, lng: origin[1] + 0.01 },
                  end_location: { lat: origin[0] + 0.02, lng: origin[1] + 0.02 },
                  html_instructions: 'Turn right onto Highway 101',
                  travel_mode: 'DRIVING'
                },
                {
                  distance: { text: '2.1 km', value: 2100 },
                  duration: { text: '4 mins', value: 240 },
                  start_location: { lat: origin[0] + 0.02, lng: origin[1] + 0.02 },
                  end_location: { lat: destination[0], lng: destination[1] },
                  html_instructions: 'Turn left onto Destination Street',
                  travel_mode: 'DRIVING'
                }
              ]
            }
          ],
          overview_polyline: {
            points: 'mock_polyline_data'
          },
          warnings: [],
          waypoint_order: []
        }
      ],
      status: 'OK',
      request: {
        origin: origin.join(','),
        destination: destination.join(','),
        waypoints: waypoints.map(wp => wp.join(',')),
        avoid: avoidHazards ? ['tolls'] : []
      }
    };

    // Add alternative routes if avoiding hazards
    if (avoidHazards) {
      mockRoute.routes.push({
        summary: 'Alternative Route (Hazard-Free)',
        legs: [
          {
            distance: { text: '6.8 km', value: 6800 },
            duration: { text: '16 mins', value: 960 },
            start_address: 'Origin Address',
            end_address: 'Destination Address',
            steps: [
              {
                distance: { text: '3.2 km', value: 3200 },
                duration: { text: '8 mins', value: 480 },
                start_location: { lat: origin[0], lng: origin[1] },
                end_location: { lat: origin[0] - 0.01, lng: origin[1] + 0.02 },
                html_instructions: 'Head south on Alternative Street',
                travel_mode: 'DRIVING'
              },
              {
                distance: { text: '3.6 km', value: 3600 },
                duration: { text: '8 mins', value: 480 },
                start_location: { lat: origin[0] - 0.01, lng: origin[1] + 0.02 },
                end_location: { lat: destination[0], lng: destination[1] },
                html_instructions: 'Continue to destination',
                travel_mode: 'DRIVING'
              }
            ]
          }
        ],
        overview_polyline: {
          points: 'mock_alternative_polyline_data'
        },
        warnings: ['This route avoids known hazards but may take longer'],
        waypoint_order: []
      });
    }

    return mockRoute;
  } catch (error) {
    console.error('Error fetching route:', error);
    throw new Error('Failed to fetch route');
  }
};

/**
 * Get detailed place information
 * @param {string} placeId - Google Places place ID
 * @returns {Promise<Object>} - Detailed place information
 */
const getPlaceDetails = async (placeId) => {
  try {
    console.log(`Getting details for place: ${placeId}`);
    
    // Mock Google Place Details API response
    const mockDetails = {
      placeId,
      name: 'Sample Place',
      formattedAddress: '123 Sample Street, Sample City, Sample State',
      formattedPhoneNumber: '+1-555-0123',
      website: 'https://example.com',
      rating: 4.2,
      userRatingsTotal: 150,
      priceLevel: 2,
      openingHours: {
        openNow: true,
        periods: [
          { open: { day: 1, time: '0800' }, close: { day: 1, time: '1800' } },
          { open: { day: 2, time: '0800' }, close: { day: 2, time: '1800' } },
          { open: { day: 3, time: '0800' }, close: { day: 3, time: '1800' } },
          { open: { day: 4, time: '0800' }, close: { day: 4, time: '1800' } },
          { open: { day: 5, time: '0800' }, close: { day: 5, time: '1800' } }
        ],
        weekdayText: [
          'Monday: 8:00 AM – 6:00 PM',
          'Tuesday: 8:00 AM – 6:00 PM',
          'Wednesday: 8:00 AM – 6:00 PM',
          'Thursday: 8:00 AM – 6:00 PM',
          'Friday: 8:00 AM – 6:00 PM',
          'Saturday: Closed',
          'Sunday: Closed'
        ]
      },
      photos: [
        {
          photoReference: 'photo_ref_1',
          height: 1080,
          width: 1920
        }
      ],
      reviews: [
        {
          authorName: 'John Doe',
          rating: 5,
          text: 'Great service and friendly staff!',
          time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
          authorName: 'Jane Smith',
          rating: 4,
          text: 'Good quality service, reasonable prices.',
          time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        }
      ],
      geometry: {
        location: {
          lat: 28.6139,
          lng: 77.2090
        }
      },
      types: ['gas_station', 'establishment']
    };

    return mockDetails;
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw new Error('Failed to fetch place details');
  }
};

/**
 * Get traffic information for a route
 * @param {Array} origin - [lat, lng] origin coordinates
 * @param {Array} destination - [lat, lng] destination coordinates
 * @returns {Promise<Object>} - Traffic information
 */
const getTrafficInfo = async (origin, destination) => {
  try {
    console.log(`Getting traffic info from ${origin} to ${destination}`);
    
    // Mock traffic data
    const trafficInfo = {
      routes: [
        {
          summary: 'Current Route',
          durationInTraffic: { text: '15 mins', value: 900 },
          duration: { text: '12 mins', value: 720 },
          trafficLevel: 'moderate',
          delays: [
            {
              location: { lat: origin[0] + 0.01, lng: origin[1] + 0.01 },
              delay: 180, // seconds
              reason: 'Construction'
            }
          ]
        }
      ],
      lastUpdated: new Date()
    };

    return trafficInfo;
  } catch (error) {
    console.error('Error fetching traffic info:', error);
    throw new Error('Failed to fetch traffic information');
  }
};

/**
 * Calculate distance between two points
 * @param {Array} point1 - [lat, lng] first point
 * @param {Array} point2 - [lat, lng] second point
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (point2[0] - point1[0]) * Math.PI / 180;
  const dLng = (point2[1] - point1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Get elevation data for coordinates
 * @param {Array} coordinates - Array of [lat, lng] coordinates
 * @returns {Promise<Array>} - Array of elevation data
 */
const getElevationData = async (coordinates) => {
  try {
    console.log(`Getting elevation data for ${coordinates.length} points`);
    
    // Mock elevation data
    const elevationData = coordinates.map((coord, index) => ({
      location: { lat: coord[0], lng: coord[1] },
      elevation: 100 + (index * 5), // Mock elevation in meters
      resolution: 1.0
    }));

    return elevationData;
  } catch (error) {
    console.error('Error fetching elevation data:', error);
    throw new Error('Failed to fetch elevation data');
  }
};

module.exports = {
  getNearbyPlaces,
  getRouteAlternatives,
  getPlaceDetails,
  getTrafficInfo,
  calculateDistance,
  getElevationData
};
