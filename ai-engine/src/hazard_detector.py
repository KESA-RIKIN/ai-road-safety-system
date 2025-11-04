"""
Hazard Detection Module
Uses YOLOv8 and TensorFlow Lite for real-time hazard detection
"""

import cv2
import numpy as np
import logging
from typing import List, Dict, Any, Optional
from ultralytics import YOLO
import tensorflow as tf
from PIL import Image
import requests
from io import BytesIO

logger = logging.getLogger(__name__)

class HazardDetector:
    """Main hazard detection class using YOLOv8 and TensorFlow Lite"""
    
    def __init__(self, model_manager):
        self.model_manager = model_manager
        self.confidence_threshold = 0.5
        self.nms_threshold = 0.4
        
        # Hazard class mappings
        self.hazard_classes = {
            0: 'pothole',
            1: 'debris',
            2: 'speed_breaker',
            3: 'stalled_vehicle',
            4: 'construction',
            5: 'flooding',
            6: 'person',  # For privacy filtering
            7: 'license_plate'  # For privacy filtering
        }
        
        # Severity mapping based on hazard type and confidence
        self.severity_mapping = {
            'pothole': {'low': 0.3, 'medium': 0.6, 'high': 0.8, 'critical': 0.95},
            'debris': {'low': 0.4, 'medium': 0.7, 'high': 0.9, 'critical': 0.98},
            'speed_breaker': {'low': 0.2, 'medium': 0.5, 'high': 0.8, 'critical': 0.95},
            'stalled_vehicle': {'low': 0.3, 'medium': 0.6, 'high': 0.85, 'critical': 0.95},
            'construction': {'low': 0.2, 'medium': 0.5, 'high': 0.8, 'critical': 0.9},
            'flooding': {'low': 0.4, 'medium': 0.7, 'high': 0.9, 'critical': 0.98}
        }
        
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize YOLO and TensorFlow Lite models"""
        try:
            # Load YOLOv8 model for hazard detection
            self.yolo_model = YOLO('yolov8n.pt')  # Use nano version for mobile
            logger.info("YOLOv8 model loaded successfully")
            
            # Load TensorFlow Lite model for additional classification
            self.tflite_model = self.model_manager.load_tflite_model('hazard_classifier.tflite')
            logger.info("TensorFlow Lite model loaded successfully")
            
            self._ready = True
            
        except Exception as e:
            logger.error(f"Failed to initialize models: {e}")
            self._ready = False
    
    def is_ready(self) -> bool:
        """Check if detector is ready"""
        return self._ready
    
    def detect_hazards(self, image_url: str) -> List[Dict[str, Any]]:
        """
        Detect hazards in an image
        
        Args:
            image_url: URL of the image to analyze
            
        Returns:
            List of detected hazards with bounding boxes and classifications
        """
        try:
            # Load and preprocess image
            image = self._load_image(image_url)
            if image is None:
                return []
            
            # Run YOLO detection
            yolo_results = self._run_yolo_detection(image)
            
            # Run TensorFlow Lite classification for additional accuracy
            tflite_results = self._run_tflite_classification(image)
            
            # Combine and filter results
            detections = self._combine_detections(yolo_results, tflite_results)
            
            # Apply confidence threshold and NMS
            filtered_detections = self._filter_detections(detections)
            
            logger.info(f"Detected {len(filtered_detections)} hazards")
            return filtered_detections
            
        except Exception as e:
            logger.error(f"Hazard detection failed: {e}")
            return []
    
    def _load_image(self, image_url: str) -> Optional[np.ndarray]:
        """Load image from URL"""
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            image = Image.open(BytesIO(response.content))
            image = image.convert('RGB')
            image_array = np.array(image)
            
            return image_array
            
        except Exception as e:
            logger.error(f"Failed to load image from {image_url}: {e}")
            return None
    
    def _run_yolo_detection(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Run YOLO detection on image"""
        try:
            results = self.yolo_model(image, conf=self.confidence_threshold)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        box = boxes[i]
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        # Map to hazard class if applicable
                        if class_id in self.hazard_classes:
                            hazard_type = self.hazard_classes[class_id]
                            
                            detection = {
                                'type': hazard_type,
                                'confidence': float(confidence),
                                'bounding_box': {
                                    'x': int(x1),
                                    'y': int(y1),
                                    'width': int(x2 - x1),
                                    'height': int(y2 - y1)
                                },
                                'method': 'yolo'
                            }
                            
                            detections.append(detection)
            
            return detections
            
        except Exception as e:
            logger.error(f"YOLO detection failed: {e}")
            return []
    
    def _run_tflite_classification(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Run TensorFlow Lite classification"""
        try:
            if self.tflite_model is None:
                return []
            
            # Preprocess image for TFLite model
            input_image = self._preprocess_for_tflite(image)
            
            # Run inference
            input_details = self.tflite_model.get_input_details()
            output_details = self.tflite_model.get_output_details()
            
            self.tflite_model.set_tensor(input_details[0]['index'], input_image)
            self.tflite_model.invoke()
            
            # Get results
            output_data = self.tflite_model.get_tensor(output_details[0]['index'])
            
            # Process results
            detections = []
            for i, confidence in enumerate(output_data[0]):
                if confidence > self.confidence_threshold:
                    hazard_type = self.hazard_classes.get(i, 'unknown')
                    
                    detection = {
                        'type': hazard_type,
                        'confidence': float(confidence),
                        'bounding_box': None,  # TFLite doesn't provide bounding boxes
                        'method': 'tflite'
                    }
                    
                    detections.append(detection)
            
            return detections
            
        except Exception as e:
            logger.error(f"TensorFlow Lite classification failed: {e}")
            return []
    
    def _preprocess_for_tflite(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for TensorFlow Lite model"""
        # Resize to model input size (typically 224x224)
        resized = cv2.resize(image, (224, 224))
        
        # Normalize to [0, 1]
        normalized = resized.astype(np.float32) / 255.0
        
        # Add batch dimension
        batched = np.expand_dims(normalized, axis=0)
        
        return batched
    
    def _combine_detections(self, yolo_results: List[Dict], tflite_results: List[Dict]) -> List[Dict[str, Any]]:
        """Combine YOLO and TensorFlow Lite results"""
        combined = []
        
        # Add YOLO results (with bounding boxes)
        for detection in yolo_results:
            combined.append(detection)
        
        # Add TFLite results (without bounding boxes, for additional confidence)
        for tflite_detection in tflite_results:
            # Check if we already have this type from YOLO
            existing = any(
                d['type'] == tflite_detection['type'] and d['method'] == 'yolo'
                for d in combined
            )
            
            if not existing:
                combined.append(tflite_detection)
        
        return combined
    
    def _filter_detections(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter detections by confidence and apply NMS"""
        # Filter by confidence threshold
        filtered = [d for d in detections if d['confidence'] >= self.confidence_threshold]
        
        # Apply Non-Maximum Suppression for YOLO detections with bounding boxes
        yolo_detections = [d for d in filtered if d['method'] == 'yolo' and d['bounding_box']]
        tflite_detections = [d for d in filtered if d['method'] == 'tflite']
        
        if yolo_detections:
            # Apply NMS
            boxes = np.array([[d['bounding_box']['x'], d['bounding_box']['y'],
                             d['bounding_box']['x'] + d['bounding_box']['width'],
                             d['bounding_box']['y'] + d['bounding_box']['height']]
                            for d in yolo_detections])
            scores = np.array([d['confidence'] for d in yolo_detections])
            
            indices = cv2.dnn.NMSBoxes(
                boxes.tolist(),
                scores.tolist(),
                self.confidence_threshold,
                self.nms_threshold
            )
            
            if len(indices) > 0:
                nms_detections = [yolo_detections[i] for i in indices.flatten()]
            else:
                nms_detections = []
        else:
            nms_detections = []
        
        # Combine NMS-filtered YOLO detections with TFLite detections
        final_detections = nms_detections + tflite_detections
        
        # Add severity classification
        for detection in final_detections:
            detection['severity'] = self._classify_severity(
                detection['type'],
                detection['confidence']
            )
        
        return final_detections
    
    def _classify_severity(self, hazard_type: str, confidence: float) -> str:
        """Classify hazard severity based on type and confidence"""
        if hazard_type not in self.severity_mapping:
            return 'low'
        
        thresholds = self.severity_mapping[hazard_type]
        
        if confidence >= thresholds['critical']:
            return 'critical'
        elif confidence >= thresholds['high']:
            return 'high'
        elif confidence >= thresholds['medium']:
            return 'medium'
        else:
            return 'low'
    
    def classify_hazard(self, features: Dict[str, Any], sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classify hazard from extracted features and sensor data
        
        Args:
            features: Extracted image features
            sensor_data: Additional sensor data (accelerometer, audio, etc.)
            
        Returns:
            Classification result with type, severity, and confidence
        """
        try:
            # Simple rule-based classification for demo
            # In a real implementation, this would use a trained ML model
            
            hazard_type = 'other'
            confidence = 0.5
            severity = 'low'
            
            # Analyze accelerometer data
            if 'accelerometer' in sensor_data:
                accel_data = sensor_data['accelerometer']
                magnitude = accel_data.get('magnitude', 0)
                
                if magnitude > 2.0:
                    hazard_type = 'pothole'
                    confidence = min(0.9, 0.5 + magnitude * 0.1)
                    severity = 'high' if magnitude > 3.0 else 'medium'
            
            # Analyze audio data
            if 'audio' in sensor_data:
                audio_data = sensor_data['audio']
                decibel_level = audio_data.get('decibelLevel', 0)
                
                if decibel_level > 80:
                    if hazard_type == 'pothole':
                        confidence = min(1.0, confidence + 0.1)
                    else:
                        hazard_type = 'debris'
                        confidence = 0.6
            
            # Analyze image features
            if 'texture' in features:
                texture = features['texture']
                if texture.get('roughness', 0) > 0.6:
                    if hazard_type == 'other':
                        hazard_type = 'debris'
                        confidence = 0.6
            
            # Final severity classification
            severity = self._classify_severity(hazard_type, confidence)
            
            return {
                'type': hazard_type,
                'severity': severity,
                'confidence': confidence,
                'reasoning': {
                    'accelerometer': 'High impact detected' if 'accelerometer' in sensor_data else 'No accelerometer data',
                    'audio': 'Loud impact sound detected' if 'audio' in sensor_data else 'No audio data',
                    'image': 'Image features analyzed'
                }
            }
            
        except Exception as e:
            logger.error(f"Hazard classification failed: {e}")
            return {
                'type': 'other',
                'severity': 'low',
                'confidence': 0.1,
                'reasoning': {'error': str(e)}
            }
    
    def update_confidence_threshold(self, threshold: float):
        """Update confidence threshold for detection"""
        if 0.0 <= threshold <= 1.0:
            self.confidence_threshold = threshold
            logger.info(f"Confidence threshold updated to {threshold}")
        else:
            raise ValueError("Confidence threshold must be between 0.0 and 1.0")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        return {
            'yolo_model': 'YOLOv8n',
            'tflite_model': 'hazard_classifier.tflite',
            'confidence_threshold': self.confidence_threshold,
            'nms_threshold': self.nms_threshold,
            'hazard_classes': list(self.hazard_classes.values()),
            'ready': self.is_ready()
        }
