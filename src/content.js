/**
 * Edge AI - Content Script Entry Point
 */

import { ContentScript } from './components/ContentScript.js';

// Initialize content script
new ContentScript();

// Export for testing
export { ContentScript };