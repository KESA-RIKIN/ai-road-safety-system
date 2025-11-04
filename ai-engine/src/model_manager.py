"""
Model Manager Module
Manages AI model loading, updating, and versioning
"""

import os
import logging
import json
import hashlib
from typing import Dict, Any, Optional, List
import tensorflow as tf
from ultralytics import YOLO
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

class ModelManager:
    """Manages AI models for hazard detection"""
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.models = {}
        self.model_versions = {}
        self.model_configs = {}
        
        # Ensure model directory exists
        os.makedirs(model_dir, exist_ok=True)
        
        # Load model configurations
        self._load_model_configs()
        
        # Initialize models
        self._initialize_models()
        
        self._ready = True
    
    def _load_model_configs(self):
        """Load model configurations from file or create defaults"""
        config_file = os.path.join(self.model_dir, "model_configs.json")
        
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    self.model_configs = json.load(f)
                logger.info("Model configurations loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load model configurations: {e}")
                self._create_default_configs()
        else:
            self._create_default_configs()
    
    def _create_default_configs(self):
        """Create default model configurations"""
        self.model_configs = {
            "yolo_hazard_detector": {
                "name": "YOLOv8 Hazard Detector",
                "version": "1.0.0",
                "type": "yolo",
                "file": "yolov8n_hazard.pt",
                "url": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt",
                "input_size": [640, 640],
                "classes": ["pothole", "debris", "speed_breaker", "stalled_vehicle", "construction", "flooding"],
                "confidence_threshold": 0.5,
                "nms_threshold": 0.4
            },
            "tflite_classifier": {
                "name": "TensorFlow Lite Hazard Classifier",
                "version": "1.0.0",
                "type": "tflite",
                "file": "hazard_classifier.tflite",
                "url": "https://example.com/models/hazard_classifier.tflite",
                "input_size": [224, 224, 3],
                "output_classes": 7,
                "quantized": True
            },
            "privacy_filter": {
                "name": "Privacy Filter",
                "version": "1.0.0",
                "type": "opencv",
                "file": "haarcascade_frontalface_default.xml",
                "url": "https://github.com/opencv/opencv/raw/master/data/haarcascades/haarcascade_frontalface_default.xml",
                "cascade_type": "face"
            }
        }
        
        # Save default configurations
        self._save_model_configs()
    
    def _save_model_configs(self):
        """Save model configurations to file"""
        try:
            config_file = os.path.join(self.model_dir, "model_configs.json")
            with open(config_file, 'w') as f:
                json.dump(self.model_configs, f, indent=2)
            logger.info("Model configurations saved")
        except Exception as e:
            logger.error(f"Failed to save model configurations: {e}")
    
    def _initialize_models(self):
        """Initialize all configured models"""
        for model_id, config in self.model_configs.items():
            try:
                self._load_model(model_id, config)
            except Exception as e:
                logger.error(f"Failed to initialize model {model_id}: {e}")
    
    def _load_model(self, model_id: str, config: Dict[str, Any]):
        """Load a specific model"""
        try:
            model_path = os.path.join(self.model_dir, config["file"])
            
            # Check if model file exists
            if not os.path.exists(model_path):
                logger.warning(f"Model file not found: {model_path}")
                # In a real implementation, download the model
                # self._download_model(model_id, config)
                return
            
            # Load model based on type
            if config["type"] == "yolo":
                model = YOLO(model_path)
                self.models[model_id] = model
                logger.info(f"YOLO model {model_id} loaded successfully")
                
            elif config["type"] == "tflite":
                interpreter = tf.lite.Interpreter(model_path=model_path)
                interpreter.allocate_tensors()
                self.models[model_id] = interpreter
                logger.info(f"TensorFlow Lite model {model_id} loaded successfully")
                
            elif config["type"] == "opencv":
                # OpenCV cascades are loaded in the privacy filter
                self.models[model_id] = {"path": model_path, "loaded": True}
                logger.info(f"OpenCV model {model_id} configured")
            
            # Store model version
            self.model_versions[model_id] = config["version"]
            
        except Exception as e:
            logger.error(f"Failed to load model {model_id}: {e}")
            raise
    
    def load_tflite_model(self, model_name: str) -> Optional[tf.lite.Interpreter]:
        """Load a TensorFlow Lite model by name"""
        try:
            if model_name in self.models:
                return self.models[model_name]
            
            # Try to find model by file name
            for model_id, config in self.model_configs.items():
                if config.get("file") == model_name and config["type"] == "tflite":
                    self._load_model(model_id, config)
                    return self.models[model_id]
            
            logger.warning(f"TensorFlow Lite model {model_name} not found")
            return None
            
        except Exception as e:
            logger.error(f"Failed to load TensorFlow Lite model {model_name}: {e}")
            return None
    
    def get_model(self, model_id: str) -> Optional[Any]:
        """Get a loaded model by ID"""
        return self.models.get(model_id)
    
    def get_model_version(self, model_id: str = None) -> str:
        """Get model version"""
        if model_id:
            return self.model_versions.get(model_id, "unknown")
        else:
            # Return overall system version
            return "1.0.0"
    
    def get_all_model_status(self) -> Dict[str, Any]:
        """Get status of all models"""
        status = {
            "total_models": len(self.model_configs),
            "loaded_models": len(self.models),
            "models": {}
        }
        
        for model_id, config in self.model_configs.items():
            model_status = {
                "name": config["name"],
                "version": config["version"],
                "type": config["type"],
                "loaded": model_id in self.models,
                "file": config["file"],
                "last_updated": self._get_model_timestamp(model_id)
            }
            
            if model_id in self.models:
                model_status["status"] = "ready"
            else:
                model_status["status"] = "not_loaded"
            
            status["models"][model_id] = model_status
        
        return status
    
    def _get_model_timestamp(self, model_id: str) -> Optional[str]:
        """Get model file timestamp"""
        try:
            config = self.model_configs.get(model_id)
            if config:
                model_path = os.path.join(self.model_dir, config["file"])
                if os.path.exists(model_path):
                    timestamp = os.path.getmtime(model_path)
                    return datetime.fromtimestamp(timestamp).isoformat()
        except Exception as e:
            logger.error(f"Failed to get timestamp for model {model_id}: {e}")
        
        return None
    
    def update_models(self) -> Dict[str, Any]:
        """Update all models to latest versions"""
        try:
            update_results = {
                "updated": [],
                "failed": [],
                "skipped": []
            }
            
            for model_id, config in self.model_configs.items():
                try:
                    # Check if update is available
                    if self._check_model_update(model_id, config):
                        # Download and update model
                        if self._download_model(model_id, config):
                            update_results["updated"].append(model_id)
                        else:
                            update_results["failed"].append(model_id)
                    else:
                        update_results["skipped"].append(model_id)
                        
                except Exception as e:
                    logger.error(f"Failed to update model {model_id}: {e}")
                    update_results["failed"].append(model_id)
            
            return update_results
            
        except Exception as e:
            logger.error(f"Model update failed: {e}")
            return {"error": str(e)}
    
    def _check_model_update(self, model_id: str, config: Dict[str, Any]) -> bool:
        """Check if model update is available"""
        try:
            # In a real implementation, this would check a model registry
            # For demo purposes, we'll simulate update availability
            current_version = config["version"]
            
            # Simulate version check
            # In reality, this would make an API call to check for updates
            return False  # No updates available for demo
            
        except Exception as e:
            logger.error(f"Failed to check update for model {model_id}: {e}")
            return False
    
    def _download_model(self, model_id: str, config: Dict[str, Any]) -> bool:
        """Download model from URL"""
        try:
            model_url = config.get("url")
            if not model_url:
                logger.warning(f"No download URL for model {model_id}")
                return False
            
            model_path = os.path.join(self.model_dir, config["file"])
            
            logger.info(f"Downloading model {model_id} from {model_url}")
            
            # Download model file
            response = requests.get(model_url, stream=True, timeout=30)
            response.raise_for_status()
            
            # Save model file
            with open(model_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # Verify download
            if os.path.exists(model_path) and os.path.getsize(model_path) > 0:
                logger.info(f"Model {model_id} downloaded successfully")
                
                # Reload model
                self._load_model(model_id, config)
                
                return True
            else:
                logger.error(f"Downloaded model file is invalid: {model_path}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to download model {model_id}: {e}")
            return False
    
    def add_model(self, model_id: str, config: Dict[str, Any]) -> bool:
        """Add a new model configuration"""
        try:
            # Validate configuration
            required_fields = ["name", "version", "type", "file"]
            for field in required_fields:
                if field not in config:
                    raise ValueError(f"Missing required field: {field}")
            
            # Add to configurations
            self.model_configs[model_id] = config
            
            # Save configurations
            self._save_model_configs()
            
            # Load model if file exists
            model_path = os.path.join(self.model_dir, config["file"])
            if os.path.exists(model_path):
                self._load_model(model_id, config)
            
            logger.info(f"Model {model_id} added successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add model {model_id}: {e}")
            return False
    
    def remove_model(self, model_id: str) -> bool:
        """Remove a model configuration"""
        try:
            if model_id not in self.model_configs:
                logger.warning(f"Model {model_id} not found")
                return False
            
            # Remove from loaded models
            if model_id in self.models:
                del self.models[model_id]
            
            # Remove from versions
            if model_id in self.model_versions:
                del self.model_versions[model_id]
            
            # Remove from configurations
            del self.model_configs[model_id]
            
            # Save configurations
            self._save_model_configs()
            
            logger.info(f"Model {model_id} removed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to remove model {model_id}: {e}")
            return False
    
    def get_model_info(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a model"""
        try:
            if model_id not in self.model_configs:
                return None
            
            config = self.model_configs[model_id]
            model_path = os.path.join(self.model_dir, config["file"])
            
            info = {
                "id": model_id,
                "name": config["name"],
                "version": config["version"],
                "type": config["type"],
                "file": config["file"],
                "path": model_path,
                "loaded": model_id in self.models,
                "exists": os.path.exists(model_path),
                "size": os.path.getsize(model_path) if os.path.exists(model_path) else 0,
                "last_modified": self._get_model_timestamp(model_id)
            }
            
            # Add model-specific information
            if config["type"] == "yolo" and model_id in self.models:
                model = self.models[model_id]
                info["yolo_info"] = {
                    "model_name": model.model_name if hasattr(model, 'model_name') else 'unknown',
                    "num_classes": len(config.get("classes", [])),
                    "input_size": config.get("input_size", [])
                }
            
            elif config["type"] == "tflite" and model_id in self.models:
                interpreter = self.models[model_id]
                input_details = interpreter.get_input_details()
                output_details = interpreter.get_output_details()
                
                info["tflite_info"] = {
                    "input_shape": input_details[0]["shape"] if input_details else None,
                    "output_shape": output_details[0]["shape"] if output_details else None,
                    "quantized": config.get("quantized", False)
                }
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get model info for {model_id}: {e}")
            return None
    
    def is_ready(self) -> bool:
        """Check if model manager is ready"""
        return self._ready and len(self.models) > 0
    
    def get_model_hash(self, model_id: str) -> Optional[str]:
        """Get MD5 hash of model file"""
        try:
            config = self.model_configs.get(model_id)
            if not config:
                return None
            
            model_path = os.path.join(self.model_dir, config["file"])
            if not os.path.exists(model_path):
                return None
            
            with open(model_path, 'rb') as f:
                file_hash = hashlib.md5()
                for chunk in iter(lambda: f.read(4096), b""):
                    file_hash.update(chunk)
                return file_hash.hexdigest()
                
        except Exception as e:
            logger.error(f"Failed to get hash for model {model_id}: {e}")
            return None
