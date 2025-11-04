/**
 * Service Manager
 * Centralized service initialization and management
 */

import { HazardService } from './HazardService';
import { LocationService } from './LocationService';
import { SensorService } from './SensorService';
import { NotificationService } from './NotificationService';
import { ApiService } from './ApiService';
import { StorageService } from './StorageService';

class ServiceManager {
  constructor() {
    this.services = {};
    this.isInitialized = false;
  }

  async initializeServices() {
    try {
      console.log('Initializing services...');

      // Initialize storage service first
      await StorageService.initialize();

      // Initialize API service
      await ApiService.initialize();

      // Initialize location service
      await LocationService.initialize();

      // Initialize sensor service
      await SensorService.initialize();

      // Initialize notification service
      await NotificationService.initialize();

      // Initialize hazard service
      await HazardService.initialize();

      this.isInitialized = true;
      console.log('All services initialized successfully');

    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    }
  }

  getService(serviceName) {
    return this.services[serviceName];
  }

  isServiceReady(serviceName) {
    const service = this.services[serviceName];
    return service && service.isReady();
  }

  async restartService(serviceName) {
    try {
      const service = this.services[serviceName];
      if (service && typeof service.restart === 'function') {
        await service.restart();
        console.log(`Service ${serviceName} restarted successfully`);
      }
    } catch (error) {
      console.error(`Failed to restart service ${serviceName}:`, error);
    }
  }

  async shutdown() {
    try {
      console.log('Shutting down services...');

      // Shutdown all services in reverse order
      const serviceNames = Object.keys(this.services).reverse();
      
      for (const serviceName of serviceNames) {
        const service = this.services[serviceName];
        if (service && typeof service.shutdown === 'function') {
          await service.shutdown();
        }
      }

      this.isInitialized = false;
      console.log('All services shut down successfully');

    } catch (error) {
      console.error('Service shutdown failed:', error);
    }
  }
}

// Create singleton instance
const serviceManager = new ServiceManager();

// Export initialization function
export const initializeServices = () => serviceManager.initializeServices();

// Export service manager instance
export default serviceManager;
