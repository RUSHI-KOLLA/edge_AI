/**
 * Edge AI - Background Script Entry Point
 */

import { BackgroundService } from './components/ServiceWorker.js';

// Initialize background service
new BackgroundService();

// Handle extension lifecycle
chrome.runtime.onStartup.addListener(() => {
  console.log('[Edge AI] Extension started');
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('[Edge AI] Extension suspended');
});

// Export for testing
export { BackgroundService };