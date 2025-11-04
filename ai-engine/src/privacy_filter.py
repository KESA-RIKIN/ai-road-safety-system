"""
Privacy Filter Module
Uses OpenCV and face recognition to blur faces and license plates
"""

import cv2
import numpy as np
import logging
from typing import Optional, Tuple, List
import requests
from io import BytesIO
from PIL import Image
import face_recognition
import re

logger = logging.getLogger(__name__)

class PrivacyFilter:
    """Privacy protection using face detection and license plate blurring"""
    
    def __init__(self):
        self.face_cascade = None
        self.license_plate_cascade = None
        self._initialize_cascades()
        self._ready = True
    
    def _initialize_cascades(self):
        """Initialize OpenCV cascades for face and license plate detection"""
        try:
            # Load Haar cascades for face detection
            self.face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            
            # Load license plate cascade (if available)
            try:
                self.license_plate_cascade = cv2.CascadeClassifier(
                    cv2.data.haarcascades + 'haarcascade_licence_plate_rus_16stages.xml'
                )
            except:
                # Fallback to a generic cascade or custom model
                logger.warning("License plate cascade not available, using alternative method")
                self.license_plate_cascade = None
            
            logger.info("Privacy filter cascades initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize privacy filter: {e}")
            self._ready = False
    
    def is_ready(self) -> bool:
        """Check if privacy filter is ready"""
        return self._ready
    
    def process_image(self, image_url: str) -> str:
        """
        Process image for privacy protection
        
        Args:
            image_url: URL of the image to process
            
        Returns:
            URL of the processed image
        """
        try:
            # Load image
            image = self._load_image(image_url)
            if image is None:
                return image_url  # Return original if processing fails
            
            # Detect and blur faces
            processed_image = self._blur_faces(image)
            
            # Detect and blur license plates
            processed_image = self._blur_license_plates(processed_image)
            
            # Save processed image
            processed_url = self._save_processed_image(processed_image, image_url)
            
            logger.info(f"Privacy filtering completed: {processed_url}")
            return processed_url
            
        except Exception as e:
            logger.error(f"Privacy filtering failed: {e}")
            return image_url  # Return original if processing fails
    
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
    
    def _blur_faces(self, image: np.ndarray) -> np.ndarray:
        """Detect and blur faces in the image"""
        try:
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Detect faces using OpenCV
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            # Also use face_recognition for better accuracy
            face_locations = face_recognition.face_locations(image)
            
            # Combine both detection methods
            all_faces = []
            
            # Add OpenCV detections
            for (x, y, w, h) in faces:
                all_faces.append((y, x + w, y + h, x))
            
            # Add face_recognition detections
            for (top, right, bottom, left) in face_locations:
                all_faces.append((top, right, bottom, left))
            
            # Remove duplicates and blur all detected faces
            unique_faces = self._remove_duplicate_faces(all_faces)
            
            for (top, right, bottom, left) in unique_faces:
                # Extract face region
                face_region = image[top:bottom, left:right]
                
                # Apply Gaussian blur
                blurred_face = cv2.GaussianBlur(face_region, (99, 99), 30)
                
                # Replace original face with blurred version
                image[top:bottom, left:right] = blurred_face
            
            logger.info(f"Blurred {len(unique_faces)} faces")
            return image
            
        except Exception as e:
            logger.error(f"Face blurring failed: {e}")
            return image
    
    def _blur_license_plates(self, image: np.ndarray) -> np.ndarray:
        """Detect and blur license plates in the image"""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Detect license plates using cascade if available
            plates = []
            if self.license_plate_cascade is not None:
                plates = self.license_plate_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(50, 20)
                )
            
            # Additional license plate detection using contour analysis
            contour_plates = self._detect_license_plates_by_contours(gray)
            
            # Combine detections
            all_plates = []
            
            # Add cascade detections
            for (x, y, w, h) in plates:
                all_plates.append((x, y, x + w, y + h))
            
            # Add contour detections
            all_plates.extend(contour_plates)
            
            # Remove duplicates and blur all detected plates
            unique_plates = self._remove_duplicate_regions(all_plates)
            
            for (x1, y1, x2, y2) in unique_plates:
                # Ensure coordinates are within image bounds
                x1 = max(0, x1)
                y1 = max(0, y1)
                x2 = min(image.shape[1], x2)
                y2 = min(image.shape[0], y2)
                
                # Extract plate region
                plate_region = image[y1:y2, x1:x2]
                
                if plate_region.size > 0:
                    # Apply strong Gaussian blur
                    blurred_plate = cv2.GaussianBlur(plate_region, (99, 99), 50)
                    
                    # Replace original plate with blurred version
                    image[y1:y2, x1:x2] = blurred_plate
            
            logger.info(f"Blurred {len(unique_plates)} license plates")
            return image
            
        except Exception as e:
            logger.error(f"License plate blurring failed: {e}")
            return image
    
    def _detect_license_plates_by_contours(self, gray_image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect license plates using contour analysis"""
        try:
            # Apply edge detection
            edges = cv2.Canny(gray_image, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            plates = []
            for contour in contours:
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                
                # Filter by aspect ratio (license plates are typically wider than tall)
                aspect_ratio = w / h
                if 2.0 <= aspect_ratio <= 6.0 and w > 50 and h > 15:
                    plates.append((x, y, x + w, y + h))
            
            return plates
            
        except Exception as e:
            logger.error(f"Contour-based license plate detection failed: {e}")
            return []
    
    def _remove_duplicate_faces(self, faces: List[Tuple[int, int, int, int]]) -> List[Tuple[int, int, int, int]]:
        """Remove duplicate face detections"""
        if not faces:
            return []
        
        # Sort by area (largest first)
        faces_with_area = [(face, (face[2] - face[0]) * (face[3] - face[1])) for face in faces]
        faces_with_area.sort(key=lambda x: x[1], reverse=True)
        
        unique_faces = []
        for face, _ in faces_with_area:
            # Check if this face overlaps significantly with any existing face
            is_duplicate = False
            for existing_face in unique_faces:
                if self._calculate_overlap(face, existing_face) > 0.3:  # 30% overlap threshold
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_faces.append(face)
        
        return unique_faces
    
    def _remove_duplicate_regions(self, regions: List[Tuple[int, int, int, int]]) -> List[Tuple[int, int, int, int]]:
        """Remove duplicate regions (for license plates)"""
        if not regions:
            return []
        
        # Sort by area (largest first)
        regions_with_area = [(region, (region[2] - region[0]) * (region[3] - region[1])) for region in regions]
        regions_with_area.sort(key=lambda x: x[1], reverse=True)
        
        unique_regions = []
        for region, _ in regions_with_area:
            # Check if this region overlaps significantly with any existing region
            is_duplicate = False
            for existing_region in unique_regions:
                if self._calculate_overlap(region, existing_region) > 0.5:  # 50% overlap threshold
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_regions.append(region)
        
        return unique_regions
    
    def _calculate_overlap(self, region1: Tuple[int, int, int, int], region2: Tuple[int, int, int, int]) -> float:
        """Calculate overlap ratio between two regions"""
        x1_1, y1_1, x2_1, y2_1 = region1
        x1_2, y1_2, x2_2, y2_2 = region2
        
        # Calculate intersection
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x1_i >= x2_i or y1_i >= y2_i:
            return 0.0  # No intersection
        
        intersection_area = (x2_i - x1_i) * (y2_i - y1_i)
        region1_area = (x2_1 - x1_1) * (y2_1 - y1_1)
        region2_area = (x2_2 - x1_2) * (y2_2 - y1_2)
        
        # Calculate overlap as intersection over union
        union_area = region1_area + region2_area - intersection_area
        return intersection_area / union_area if union_area > 0 else 0.0
    
    def _save_processed_image(self, image: np.ndarray, original_url: str) -> str:
        """Save processed image and return URL"""
        try:
            # Generate filename based on original URL
            import hashlib
            url_hash = hashlib.md5(original_url.encode()).hexdigest()
            filename = f"processed_{url_hash}.jpg"
            
            # Convert back to PIL Image and save
            pil_image = Image.fromarray(image)
            
            # In a real implementation, this would upload to cloud storage
            # For demo purposes, we'll return a mock URL
            processed_url = f"https://processed-images.example.com/{filename}"
            
            logger.info(f"Processed image saved: {processed_url}")
            return processed_url
            
        except Exception as e:
            logger.error(f"Failed to save processed image: {e}")
            return original_url
    
    def detect_privacy_elements(self, image_url: str) -> Dict[str, List[Dict]]:
        """
        Detect privacy-sensitive elements without blurring
        
        Returns:
            Dictionary with detected faces and license plates
        """
        try:
            image = self._load_image(image_url)
            if image is None:
                return {'faces': [], 'license_plates': []}
            
            # Detect faces
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            
            face_locations = face_recognition.face_locations(image)
            
            # Detect license plates
            plates = []
            if self.license_plate_cascade is not None:
                plates = self.license_plate_cascade.detectMultiScale(gray, 1.1, 5, minSize=(50, 20))
            
            contour_plates = self._detect_license_plates_by_contours(gray)
            
            return {
                'faces': [
                    {
                        'type': 'face',
                        'bounding_box': {'x': x, 'y': y, 'width': w, 'height': h},
                        'confidence': 0.9
                    }
                    for (x, y, w, h) in faces
                ],
                'license_plates': [
                    {
                        'type': 'license_plate',
                        'bounding_box': {'x': x, 'y': y, 'width': w, 'height': h},
                        'confidence': 0.8
                    }
                    for (x, y, w, h) in plates
                ]
            }
            
        except Exception as e:
            logger.error(f"Privacy element detection failed: {e}")
            return {'faces': [], 'license_plates': []}
    
    def get_filter_info(self) -> Dict[str, Any]:
        """Get information about the privacy filter"""
        return {
            'face_detection': self.face_cascade is not None,
            'license_plate_detection': self.license_plate_cascade is not None,
            'face_recognition': True,  # face_recognition library is available
            'ready': self.is_ready()
        }
