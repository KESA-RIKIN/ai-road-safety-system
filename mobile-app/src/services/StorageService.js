/**
 * Storage Service
 * Handles local storage using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  constructor() {
    this.isInitialized = false;
    this.keys = {
      AUTH_TOKEN: 'auth_token',
      USER_DATA: 'user_data',
      USER_PREFERENCES: 'user_preferences',
      DEVICE_TOKEN: 'device_token',
      LAST_LOCATION: 'last_location',
      CACHED_HAZARDS: 'cached_hazards',
      CACHED_ALERTS: 'cached_alerts',
      APP_SETTINGS: 'app_settings',
    };
  }

  async initialize() {
    try {
      // Test AsyncStorage
      await AsyncStorage.getItem('test');
      this.isInitialized = true;
      console.log('Storage Service initialized successfully');
    } catch (error) {
      console.error('Storage Service initialization failed:', error);
      throw error;
    }
  }

  isReady() {
    return this.isInitialized;
  }

  // Generic storage methods
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Failed to store ${key}:`, error);
      throw error;
    }
  }

  async getItem(key) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      throw error;
    }
  }

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  // Auth methods
  async setAuthToken(token) {
    return this.setItem(this.keys.AUTH_TOKEN, token);
  }

  async getAuthToken() {
    return this.getItem(this.keys.AUTH_TOKEN);
  }

  async removeAuthToken() {
    return this.removeItem(this.keys.AUTH_TOKEN);
  }

  // User data methods
  async setUserData(userData) {
    return this.setItem(this.keys.USER_DATA, userData);
  }

  async getUserData() {
    return this.getItem(this.keys.USER_DATA);
  }

  async removeUserData() {
    return this.removeItem(this.keys.USER_DATA);
  }

  // User preferences methods
  async setUserPreferences(preferences) {
    return this.setItem(this.keys.USER_PREFERENCES, preferences);
  }

  async getUserPreferences() {
    const preferences = await this.getItem(this.keys.USER_PREFERENCES);
    return preferences || {
      language: 'en',
      alertMode: 'voice',
      voiceEnabled: true,
      pushNotifications: true,
      smsNotifications: false,
      emailNotifications: false,
    };
  }

  async updateUserPreferences(updates) {
    const current = await this.getUserPreferences();
    const updated = { ...current, ...updates };
    return this.setUserPreferences(updated);
  }

  // Device token methods
  async setDeviceToken(token) {
    return this.setItem(this.keys.DEVICE_TOKEN, token);
  }

  async getDeviceToken() {
    return this.getItem(this.keys.DEVICE_TOKEN);
  }

  async removeDeviceToken() {
    return this.removeItem(this.keys.DEVICE_TOKEN);
  }

  // Location methods
  async setLastLocation(location) {
    return this.setItem(this.keys.LAST_LOCATION, location);
  }

  async getLastLocation() {
    return this.getItem(this.keys.LAST_LOCATION);
  }

  // Cache methods
  async setCachedHazards(hazards) {
    return this.setItem(this.keys.CACHED_HAZARDS, {
      data: hazards,
      timestamp: Date.now(),
    });
  }

  async getCachedHazards() {
    const cached = await this.getItem(this.keys.CACHED_HAZARDS);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
      return cached.data;
    }
    return null;
  }

  async setCachedAlerts(alerts) {
    return this.setItem(this.keys.CACHED_ALERTS, {
      data: alerts,
      timestamp: Date.now(),
    });
  }

  async getCachedAlerts() {
    const cached = await this.getItem(this.keys.CACHED_ALERTS);
    if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) { // 2 minutes
      return cached.data;
    }
    return null;
  }

  // App settings methods
  async setAppSettings(settings) {
    return this.setItem(this.keys.APP_SETTINGS, settings);
  }

  async getAppSettings() {
    const settings = await this.getItem(this.keys.APP_SETTINGS);
    return settings || {
      firstLaunch: true,
      tutorialCompleted: false,
      analyticsEnabled: true,
      crashReportingEnabled: true,
      debugMode: false,
    };
  }

  async updateAppSettings(updates) {
    const current = await this.getAppSettings();
    const updated = { ...current, ...updates };
    return this.setAppSettings(updated);
  }

  // Utility methods
  async getAllKeys() {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  }

  async getStorageSize() {
    try {
      const keys = await this.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
      return 0;
    }
  }

  async cleanup() {
    try {
      // Remove expired cache entries
      const keys = await this.getAllKeys();
      const now = Date.now();
      
      for (const key of keys) {
        if (key.includes('cached_')) {
          const value = await this.getItem(key);
          if (value && value.timestamp && now - value.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
            await this.removeItem(key);
          }
        }
      }
      
      console.log('Storage cleanup completed');
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }
}

// Create singleton instance
const storageService = new StorageService();

export { StorageService };
export default storageService;
