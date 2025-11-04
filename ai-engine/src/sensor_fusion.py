"""
Sensor Fusion Module
Combines camera, accelerometer, and audio data for improved hazard detection
"""

import numpy as np
import logging
from typing import Dict, List, Any, Optional
from scipy import signal
from scipy.stats import entropy
import math

logger = logging.getLogger(__name__)

class SensorFusion:
    """Sensor fusion for multi-modal hazard detection"""
    
    def __init__(self):
        self.weights = {
            'camera': 0.4,
            'accelerometer': 0.3,
            'audio': 0.2,
            'location': 0.1
        }
        
        # Thresholds for different sensor types
        self.thresholds = {
            'accelerometer': {
                'pothole': {'magnitude': 2.0, 'duration': 0.1},
                'speed_breaker': {'magnitude': 1.5, 'duration': 0.2},
                'debris': {'magnitude': 1.0, 'duration': 0.05}
            },
            'audio': {
                'pothole': {'decibel': 75, 'frequency': 100},
                'speed_breaker': {'decibel': 70, 'frequency': 80},
                'debris': {'decibel': 65, 'frequency': 120}
            }
        }
        
        self._ready = True
    
    def is_ready(self) -> bool:
        """Check if sensor fusion is ready"""
        return self._ready
    
    def fuse_data(self, camera_detections: List[Dict[str, Any]], sensor_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Fuse camera detections with sensor data
        
        Args:
            camera_detections: List of camera-based detections
            sensor_data: Dictionary containing accelerometer, audio, and location data
            
        Returns:
            List of fused detection results
        """
        try:
            if not camera_detections:
                # If no camera detections, try to detect hazards from sensor data alone
                return self._detect_from_sensors_only(sensor_data)
            
            fused_detections = []
            
            for detection in camera_detections:
                # Get sensor evidence for this detection
                sensor_evidence = self._get_sensor_evidence(detection, sensor_data)
                
                # Calculate fused confidence
                fused_confidence = self._calculate_fused_confidence(detection, sensor_evidence)
                
                # Update detection with fused information
                fused_detection = detection.copy()
                fused_detection['confidence'] = fused_confidence
                fused_detection['sensor_evidence'] = sensor_evidence
                fused_detection['fusion_method'] = 'multi_modal'
                
                # Reclassify severity based on fused data
                fused_detection['severity'] = self._reclassify_severity(fused_detection)
                
                fused_detections.append(fused_detection)
            
            # Sort by confidence
            fused_detections.sort(key=lambda x: x['confidence'], reverse=True)
            
            logger.info(f"Fused {len(fused_detections)} detections with sensor data")
            return fused_detections
            
        except Exception as e:
            logger.error(f"Sensor fusion failed: {e}")
            return camera_detections  # Return original detections if fusion fails
    
    def _detect_from_sensors_only(self, sensor_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect hazards from sensor data when no camera detections are available"""
        try:
            detections = []
            
            # Analyze accelerometer data
            if 'accelerometer' in sensor_data:
                accel_detections = self._analyze_accelerometer(sensor_data['accelerometer'])
                detections.extend(accel_detections)
            
            # Analyze audio data
            if 'audio' in sensor_data:
                audio_detections = self._analyze_audio(sensor_data['audio'])
                detections.extend(audio_detections)
            
            # Combine and deduplicate sensor-only detections
            if detections:
                detections = self._deduplicate_sensor_detections(detections)
            
            return detections
            
        except Exception as e:
            logger.error(f"Sensor-only detection failed: {e}")
            return []
    
    def _get_sensor_evidence(self, detection: Dict[str, Any], sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get sensor evidence supporting a camera detection"""
        evidence = {
            'accelerometer': {'score': 0.0, 'details': {}},
            'audio': {'score': 0.0, 'details': {}},
            'location': {'score': 0.0, 'details': {}}
        }
        
        hazard_type = detection['type']
        
        # Analyze accelerometer evidence
        if 'accelerometer' in sensor_data:
            accel_evidence = self._analyze_accelerometer_evidence(
                hazard_type, sensor_data['accelerometer']
            )
            evidence['accelerometer'] = accel_evidence
        
        # Analyze audio evidence
        if 'audio' in sensor_data:
            audio_evidence = self._analyze_audio_evidence(
                hazard_type, sensor_data['audio']
            )
            evidence['audio'] = audio_evidence
        
        # Analyze location evidence
        if 'location' in sensor_data:
            location_evidence = self._analyze_location_evidence(
                hazard_type, sensor_data['location']
            )
            evidence['location'] = location_evidence
        
        return evidence
    
    def _analyze_accelerometer_evidence(self, hazard_type: str, accel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze accelerometer data for evidence of specific hazard type"""
        try:
            magnitude = accel_data.get('magnitude', 0)
            x = accel_data.get('x', 0)
            y = accel_data.get('y', 0)
            z = accel_data.get('z', 0)
            
            # Get thresholds for this hazard type
            thresholds = self.thresholds['accelerometer'].get(hazard_type, {})
            magnitude_threshold = thresholds.get('magnitude', 1.0)
            
            # Calculate evidence score
            if magnitude >= magnitude_threshold:
                score = min(1.0, magnitude / (magnitude_threshold * 2))
            else:
                score = magnitude / magnitude_threshold * 0.5
            
            # Analyze impact pattern
            impact_pattern = self._analyze_impact_pattern(x, y, z, hazard_type)
            
            return {
                'score': score,
                'details': {
                    'magnitude': magnitude,
                    'threshold': magnitude_threshold,
                    'impact_pattern': impact_pattern,
                    'direction': {'x': x, 'y': y, 'z': z}
                }
            }
            
        except Exception as e:
            logger.error(f"Accelerometer evidence analysis failed: {e}")
            return {'score': 0.0, 'details': {}}
    
    def _analyze_audio_evidence(self, hazard_type: str, audio_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze audio data for evidence of specific hazard type"""
        try:
            decibel_level = audio_data.get('decibelLevel', 0)
            frequency = audio_data.get('frequency', 0)
            duration = audio_data.get('duration', 0)
            
            # Get thresholds for this hazard type
            thresholds = self.thresholds['audio'].get(hazard_type, {})
            decibel_threshold = thresholds.get('decibel', 60)
            frequency_threshold = thresholds.get('frequency', 100)
            
            # Calculate evidence score based on decibel level
            if decibel_level >= decibel_threshold:
                decibel_score = min(1.0, decibel_level / (decibel_threshold * 1.5))
            else:
                decibel_score = decibel_level / decibel_threshold * 0.3
            
            # Calculate frequency score
            if frequency > 0:
                freq_score = 1.0 - abs(frequency - frequency_threshold) / frequency_threshold
                freq_score = max(0.0, min(1.0, freq_score))
            else:
                freq_score = 0.5
            
            # Combine scores
            score = (decibel_score * 0.7 + freq_score * 0.3)
            
            return {
                'score': score,
                'details': {
                    'decibel_level': decibel_level,
                    'frequency': frequency,
                    'duration': duration,
                    'decibel_threshold': decibel_threshold,
                    'frequency_threshold': frequency_threshold
                }
            }
            
        except Exception as e:
            logger.error(f"Audio evidence analysis failed: {e}")
            return {'score': 0.0, 'details': {}}
    
    def _analyze_location_evidence(self, hazard_type: str, location_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze location data for evidence of specific hazard type"""
        try:
            lat = location_data.get('lat', 0)
            lng = location_data.get('lng', 0)
            speed = location_data.get('speed', 0)
            
            # Simple location-based scoring
            # In a real implementation, this would use historical data
            # and road type information
            
            score = 0.5  # Base score
            
            # Adjust based on speed (higher speed = more impact)
            if speed > 0:
                speed_factor = min(1.0, speed / 60.0)  # Normalize to 60 km/h
                score += speed_factor * 0.3
            
            return {
                'score': score,
                'details': {
                    'latitude': lat,
                    'longitude': lng,
                    'speed': speed,
                    'road_type': 'unknown'  # Would be determined from map data
                }
            }
            
        except Exception as e:
            logger.error(f"Location evidence analysis failed: {e}")
            return {'score': 0.0, 'details': {}}
    
    def _calculate_fused_confidence(self, detection: Dict[str, Any], sensor_evidence: Dict[str, Any]) -> float:
        """Calculate fused confidence score"""
        try:
            camera_confidence = detection.get('confidence', 0.0)
            
            # Calculate weighted sensor score
            sensor_score = 0.0
            total_weight = 0.0
            
            for sensor_type, evidence in sensor_evidence.items():
                if sensor_type in self.weights:
                    weight = self.weights[sensor_type]
                    score = evidence.get('score', 0.0)
                    sensor_score += weight * score
                    total_weight += weight
            
            # Normalize sensor score
            if total_weight > 0:
                sensor_score = sensor_score / total_weight
            
            # Combine camera and sensor scores
            # Camera gets base weight, sensors provide boost or penalty
            if sensor_score > 0.5:
                # Sensors support the detection
                fused_confidence = min(1.0, camera_confidence + (sensor_score - 0.5) * 0.3)
            else:
                # Sensors don't support the detection
                fused_confidence = max(0.0, camera_confidence - (0.5 - sensor_score) * 0.2)
            
            return fused_confidence
            
        except Exception as e:
            logger.error(f"Confidence fusion failed: {e}")
            return detection.get('confidence', 0.0)
    
    def _reclassify_severity(self, detection: Dict[str, Any]) -> str:
        """Reclassify severity based on fused data"""
        try:
            confidence = detection['confidence']
            hazard_type = detection['type']
            sensor_evidence = detection.get('sensor_evidence', {})
            
            # Get base severity thresholds
            base_thresholds = {
                'low': 0.3,
                'medium': 0.6,
                'high': 0.8,
                'critical': 0.95
            }
            
            # Adjust thresholds based on sensor evidence
            sensor_boost = 0.0
            for evidence in sensor_evidence.values():
                if evidence.get('score', 0) > 0.7:
                    sensor_boost += 0.05
            
            # Apply sensor boost
            adjusted_thresholds = {
                level: threshold - sensor_boost
                for level, threshold in base_thresholds.items()
            }
            
            # Determine severity
            if confidence >= adjusted_thresholds['critical']:
                return 'critical'
            elif confidence >= adjusted_thresholds['high']:
                return 'high'
            elif confidence >= adjusted_thresholds['medium']:
                return 'medium'
            else:
                return 'low'
                
        except Exception as e:
            logger.error(f"Severity reclassification failed: {e}")
            return detection.get('severity', 'low')
    
    def _analyze_accelerometer(self, accel_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze accelerometer data for hazard detection"""
        try:
            magnitude = accel_data.get('magnitude', 0)
            x = accel_data.get('x', 0)
            y = accel_data.get('y', 0)
            z = accel_data.get('z', 0)
            
            detections = []
            
            # Detect potholes (high vertical impact)
            if magnitude > 2.0 and abs(z) > abs(x) and abs(z) > abs(y):
                detections.append({
                    'type': 'pothole',
                    'confidence': min(0.9, magnitude / 3.0),
                    'severity': 'high' if magnitude > 3.0 else 'medium',
                    'method': 'accelerometer',
                    'sensor_data': accel_data
                })
            
            # Detect speed breakers (moderate impact with specific pattern)
            elif magnitude > 1.5 and magnitude < 2.5:
                detections.append({
                    'type': 'speed_breaker',
                    'confidence': min(0.8, magnitude / 2.5),
                    'severity': 'medium',
                    'method': 'accelerometer',
                    'sensor_data': accel_data
                })
            
            # Detect debris (lateral impact)
            elif magnitude > 1.0 and (abs(x) > abs(z) or abs(y) > abs(z)):
                detections.append({
                    'type': 'debris',
                    'confidence': min(0.7, magnitude / 2.0),
                    'severity': 'low',
                    'method': 'accelerometer',
                    'sensor_data': accel_data
                })
            
            return detections
            
        except Exception as e:
            logger.error(f"Accelerometer analysis failed: {e}")
            return []
    
    def _analyze_audio(self, audio_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze audio data for hazard detection"""
        try:
            decibel_level = audio_data.get('decibelLevel', 0)
            frequency = audio_data.get('frequency', 0)
            
            detections = []
            
            # Detect high-impact sounds
            if decibel_level > 80:
                detections.append({
                    'type': 'pothole',
                    'confidence': min(0.8, decibel_level / 100.0),
                    'severity': 'high' if decibel_level > 90 else 'medium',
                    'method': 'audio',
                    'sensor_data': audio_data
                })
            
            # Detect medium-impact sounds
            elif decibel_level > 70:
                detections.append({
                    'type': 'debris',
                    'confidence': min(0.6, decibel_level / 80.0),
                    'severity': 'medium',
                    'method': 'audio',
                    'sensor_data': audio_data
                })
            
            return detections
            
        except Exception as e:
            logger.error(f"Audio analysis failed: {e}")
            return []
    
    def _analyze_impact_pattern(self, x: float, y: float, z: float, hazard_type: str) -> str:
        """Analyze the pattern of impact for hazard classification"""
        try:
            # Calculate impact direction
            total_magnitude = math.sqrt(x*x + y*y + z*z)
            
            if total_magnitude == 0:
                return 'none'
            
            # Normalize components
            x_norm = abs(x) / total_magnitude
            y_norm = abs(y) / total_magnitude
            z_norm = abs(z) / total_magnitude
            
            # Determine primary impact direction
            if z_norm > x_norm and z_norm > y_norm:
                return 'vertical'  # Pothole or speed breaker
            elif x_norm > y_norm and x_norm > z_norm:
                return 'lateral_x'  # Side impact
            elif y_norm > x_norm and y_norm > z_norm:
                return 'lateral_y'  # Forward/backward impact
            else:
                return 'mixed'
                
        except Exception as e:
            logger.error(f"Impact pattern analysis failed: {e}")
            return 'unknown'
    
    def _deduplicate_sensor_detections(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate sensor detections"""
        try:
            if not detections:
                return []
            
            # Group by type
            type_groups = {}
            for detection in detections:
                hazard_type = detection['type']
                if hazard_type not in type_groups:
                    type_groups[hazard_type] = []
                type_groups[hazard_type].append(detection)
            
            # Keep highest confidence detection for each type
            unique_detections = []
            for hazard_type, group in type_groups.items():
                best_detection = max(group, key=lambda x: x['confidence'])
                unique_detections.append(best_detection)
            
            return unique_detections
            
        except Exception as e:
            logger.error(f"Sensor detection deduplication failed: {e}")
            return detections
    
    def get_fusion_info(self) -> Dict[str, Any]:
        """Get information about the sensor fusion system"""
        return {
            'weights': self.weights,
            'thresholds': self.thresholds,
            'ready': self.is_ready()
        }
