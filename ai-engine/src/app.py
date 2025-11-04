"""
AI Engine for Road Hazard Detection
Main Flask application for AI processing services
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime
import traceback

# Import AI modules
import hazard_detector
import privacy_filter
import sensor_fusion
import model_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MODEL_FOLDER'] = 'models'

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MODEL_FOLDER'], exist_ok=True)

# Initialize AI components
try:
    model_manager = ModelManager()
    hazard_detector = HazardDetector(model_manager)
    privacy_filter = PrivacyFilter()
    sensor_fusion = SensorFusion()
    logger.info("AI components initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize AI components: {e}")
    raise

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0',
        'components': {
            'hazard_detector': hazard_detector.is_ready(),
            'privacy_filter': privacy_filter.is_ready(),
            'sensor_fusion': sensor_fusion.is_ready(),
            'model_manager': model_manager.is_ready()
        }
    })

@app.route('/detect', methods=['POST'])
def detect_hazards():
    """
    Main hazard detection endpoint
    Expects JSON with:
    - image_url: URL of the image to analyze
    - accelerometer_data: {x, y, z, magnitude}
    - audio_data: {decibel_level, frequency, duration}
    - location: {lat, lng}
    - vehicle_context: {speed, type, direction}
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['image_url']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        logger.info(f"Processing hazard detection request for image: {data['image_url']}")
        
        # Process image for privacy
        processed_image_url = privacy_filter.process_image(data['image_url'])
        
        # Detect hazards in image
        detections = hazard_detector.detect_hazards(processed_image_url)
        
        # Fuse with sensor data if available
        sensor_data = {
            'accelerometer': data.get('accelerometer_data'),
            'audio': data.get('audio_data'),
            'location': data.get('location'),
            'vehicle_context': data.get('vehicle_context')
        }
        
        fused_results = sensor_fusion.fuse_data(detections, sensor_data)
        
        # Generate response
        response = {
            'success': True,
            'data': {
                'processed_image_url': processed_image_url,
                'detections': detections,
                'fused_results': fused_results,
                'processing_time': datetime.utcnow().isoformat(),
                'metadata': {
                    'model_version': model_manager.get_model_version(),
                    'confidence_threshold': hazard_detector.confidence_threshold,
                    'sensor_data_available': any(sensor_data.values())
                }
            }
        }
        
        logger.info(f"Hazard detection completed successfully")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Hazard detection failed: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/process-image', methods=['POST'])
def process_image():
    """
    Process image for privacy protection
    """
    try:
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({'error': 'image_url is required'}), 400
        
        processed_url = privacy_filter.process_image(data['image_url'])
        
        return jsonify({
            'success': True,
            'data': {
                'original_url': data['image_url'],
                'processed_url': processed_url,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Image processing failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classify-hazard', methods=['POST'])
def classify_hazard():
    """
    Classify hazard type and severity from features
    """
    try:
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({'error': 'features are required'}), 400
        
        classification = hazard_detector.classify_hazard(
            data['features'],
            data.get('sensor_data', {})
        )
        
        return jsonify({
            'success': True,
            'data': classification
        })
        
    except Exception as e:
        logger.error(f"Hazard classification failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/models/status', methods=['GET'])
def get_model_status():
    """
    Get status of all AI models
    """
    try:
        status = model_manager.get_all_model_status()
        
        return jsonify({
            'success': True,
            'data': status
        })
        
    except Exception as e:
        logger.error(f"Failed to get model status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/models/update', methods=['POST'])
def update_models():
    """
    Update AI models (admin endpoint)
    """
    try:
        # In a real implementation, this would require authentication
        result = model_manager.update_models()
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"Model update failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/sensor-fusion', methods=['POST'])
def sensor_fusion_endpoint():
    """
    Process sensor fusion for hazard detection
    """
    try:
        data = request.get_json()
        
        if not data or 'detections' not in data:
            return jsonify({'error': 'detections are required'}), 400
        
        sensor_data = data.get('sensor_data', {})
        fused_results = sensor_fusion.fuse_data(data['detections'], sensor_data)
        
        return jsonify({
            'success': True,
            'data': fused_results
        })
        
    except Exception as e:
        logger.error(f"Sensor fusion failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large'}), 413

@app.errorhandler(400)
def bad_request(e):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting AI Engine on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
