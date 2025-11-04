import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { Card, Title, Paragraph, Button, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import services
import { HazardService } from '../services/HazardService';
import { LocationService } from '../services/LocationService';
import { SensorService } from '../services/SensorService';
import { NotificationService } from '../services/NotificationService';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyHazards, setNearbyHazards] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('Ready');
  const [sensorData, setSensorData] = useState({});
  const [recentAlerts, setRecentAlerts] = useState([]);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeHomeScreen();
    startAnimations();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      loadNearbyHazards();
    }
  }, [currentLocation]);

  const initializeHomeScreen = async () => {
    try {
      // Get current location
      const location = await LocationService.getCurrentLocation();
      setCurrentLocation(location);
      
      // Start sensor monitoring
      SensorService.onSensorData((data) => {
        setSensorData(data);
        checkForHazards(data);
      });
      
      // Load recent alerts
      loadRecentAlerts();
      
    } catch (error) {
      console.error('Home screen initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize home screen');
    }
  };

  const startAnimations = () => {
    // Pulse animation for detection button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slide in animation for cards
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const loadNearbyHazards = async () => {
    try {
      const hazards = await HazardService.getNearbyHazards(
        currentLocation.latitude,
        currentLocation.longitude,
        1 // 1km radius
      );
      setNearbyHazards(hazards);
    } catch (error) {
      console.error('Failed to load nearby hazards:', error);
    }
  };

  const loadRecentAlerts = async () => {
    try {
      const alerts = await NotificationService.getRecentAlerts(5);
      setRecentAlerts(alerts);
    } catch (error) {
      console.error('Failed to load recent alerts:', error);
    }
  };

  const checkForHazards = (sensorData) => {
    // Check accelerometer for impact
    if (sensorData.accelerometer?.magnitude > 2.0) {
      handlePotentialHazard('impact', sensorData);
    }
    
    // Check audio for loud sounds
    if (sensorData.audio?.decibelLevel > 80) {
      handlePotentialHazard('audio', sensorData);
    }
  };

  const handlePotentialHazard = async (type, data) => {
    try {
      setIsDetecting(true);
      setDetectionStatus('Analyzing...');
      
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would call the AI engine
      const mockHazard = {
        id: Date.now().toString(),
        type: 'pothole',
        severity: 'medium',
        confidence: 0.85,
        location: currentLocation,
        detectedAt: new Date(),
        sensorData: data
      };
      
      // Save hazard
      await HazardService.reportHazard(mockHazard);
      
      // Show alert
      await NotificationService.showHazardAlert(mockHazard);
      
      setDetectionStatus('Hazard Detected!');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsDetecting(false);
        setDetectionStatus('Ready');
      }, 3000);
      
    } catch (error) {
      console.error('Hazard detection failed:', error);
      setDetectionStatus('Detection Failed');
      setIsDetecting(false);
    }
  };

  const startLiveDetection = () => {
    navigation.navigate('Camera');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'medium': return '#f1c40f';
      case 'low': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return 'warning';
      case 'high': return 'alert-circle';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#3498db', '#2980b9']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Hazard Detection</Text>
        <Text style={styles.headerSubtitle}>
          {currentLocation 
            ? `Lat: ${currentLocation.latitude.toFixed(4)}, Lng: ${currentLocation.longitude.toFixed(4)}`
            : 'Getting location...'
          }
        </Text>
      </LinearGradient>

      {/* Detection Status Card */}
      <Animated.View 
        style={[
          styles.card,
          {
            transform: [
              { translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })}
            ]
          }
        ]}
      >
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={isDetecting ? "radio-button-on" : "radio-button-off"} 
                size={24} 
                color={isDetecting ? "#e74c3c" : "#2ecc71"} 
              />
              <Text style={styles.statusText}>{detectionStatus}</Text>
            </View>
            
            {sensorData.accelerometer && (
              <View style={styles.sensorData}>
                <Text style={styles.sensorLabel}>Accelerometer:</Text>
                <Text style={styles.sensorValue}>
                  Magnitude: {sensorData.accelerometer.magnitude?.toFixed(2) || 'N/A'}
                </Text>
              </View>
            )}
            
            {sensorData.audio && (
              <View style={styles.sensorData}>
                <Text style={styles.sensorLabel}>Audio:</Text>
                <Text style={styles.sensorValue}>
                  Decibels: {sensorData.audio.decibelLevel || 'N/A'}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </Animated.View>

      {/* Nearby Hazards */}
      <Animated.View 
        style={[
          styles.card,
          {
            transform: [
              { translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })}
            ]
          }
        ]}
      >
        <Card>
          <Card.Content>
            <Title>Nearby Hazards</Title>
            {nearbyHazards.length > 0 ? (
              nearbyHazards.slice(0, 3).map((hazard) => (
                <View key={hazard.id} style={styles.hazardItem}>
                  <View style={styles.hazardInfo}>
                    <Ionicons 
                      name={getSeverityIcon(hazard.severity)} 
                      size={20} 
                      color={getSeverityColor(hazard.severity)} 
                    />
                    <View style={styles.hazardDetails}>
                      <Text style={styles.hazardType}>
                        {hazard.type.charAt(0).toUpperCase() + hazard.type.slice(1)}
                      </Text>
                      <Text style={styles.hazardSeverity}>
                        {hazard.severity.toUpperCase()} • {Math.round(hazard.confidence * 100)}% confidence
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.hazardDistance}>
                    {hazard.distance ? `${hazard.distance.toFixed(1)}m` : 'Unknown'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noHazards}>No hazards detected nearby</Text>
            )}
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('Map')}
              style={styles.viewAllButton}
            >
              View All on Map
            </Button>
          </Card.Content>
        </Card>
      </Animated.View>

      {/* Recent Alerts */}
      {recentAlerts.length > 0 && (
        <Animated.View 
          style={[
            styles.card,
            {
              transform: [
                { translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })}
              ]
            }
          ]}
        >
          <Card>
            <Card.Content>
              <Title>Recent Alerts</Title>
              {recentAlerts.map((alert) => (
                <View key={alert.id} style={styles.alertItem}>
                  <Ionicons name="notifications" size={20} color="#3498db" />
                  <View style={styles.alertDetails}>
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                    <Text style={styles.alertTime}>
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        </Animated.View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Alerts')}
        >
          <Ionicons name="notifications" size={24} color="white" />
          <Text style={styles.actionText}>Alerts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Help')}
        >
          <Ionicons name="help-circle" size={24} color="white" />
          <Text style={styles.actionText}>Help</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings" size={24} color="white" />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <FAB
          icon="camera"
          style={styles.fab}
          onPress={startLiveDetection}
          label="Start Detection"
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  card: {
    margin: 15,
    marginBottom: 10,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#2c3e50',
  },
  sensorData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  sensorLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  sensorValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  hazardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  hazardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hazardDetails: {
    marginLeft: 10,
    flex: 1,
  },
  hazardType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  hazardSeverity: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  hazardDistance: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: 'bold',
  },
  noHazards: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  viewAllButton: {
    marginTop: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alertDetails: {
    marginLeft: 10,
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  alertTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 15,
    marginBottom: 100,
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fab: {
    backgroundColor: '#e74c3c',
  },
});
