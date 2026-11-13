/**
 * Edge AI - Main Configuration
 * 
 * This file contains the main configuration for the Edge AI extension.
 */

export const CONFIG = {
  // Extension metadata
  extension: {
    name: 'Edge AI',
    version: '1.0.0',
    description: 'Real-time translation and transcription with AI-powered features',
  },

  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://api.edge-ai.example.com',
    timeout: 10000,
    retries: 3,
  },

  // Supported languages
  languages: {
    default: 'en',
    supported: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'],
    autoDetect: true,
  },

  // Translation settings
  translation: {
    enabled: true,
    mode: 'real-time', // 'real-time', 'on-demand', 'batch'
    quality: 'high', // 'low', 'medium', 'high', 'ultra'
  },

  // Transcription settings
  transcription: {
    enabled: true,
    engine: 'whisper', // 'whisper', 'google', 'azure'
    language: 'auto',
    punctuation: true,
  },

  // UI Settings
  ui: {
    theme: 'dark', // 'light', 'dark', 'auto'
    fontSize: 'medium', // 'small', 'medium', 'large'
    position: 'bottom', // 'top', 'bottom', 'left', 'right'
    opacity: 0.85,
  },

  // Performance settings
  performance: {
    maxConcurrentTasks: 5,
    cacheEnabled: true,
    cacheSize: '50MB',
    lazyLoading: true,
  },
};

// Export individual config sections
export const { extension, api, languages, translation, transcription, ui, performance } = CONFIG;

export default CONFIG;
