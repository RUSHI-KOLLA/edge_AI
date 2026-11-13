/**
 * Edge AI - Service Worker
 * Background script for the Chrome extension
 */

import { CONFIG } from '../config/config.js';

class BackgroundService {
  constructor() {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recognition = null;
    this.currentLanguage = CONFIG.languages.default;
    
    this.init();
  }

  init() {
    // Handle extension install/update
    chrome.runtime.onInstalled.addListener((details) => this.onInstalled(details));
    
    // Handle messages from popup/content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => 
      this.handleMessage(message, sender, sendResponse)
    );
    
    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => 
      this.onTabUpdated(tabId, changeInfo, tab)
    );
    
    // Handle commands (keyboard shortcuts)
    chrome.commands.onCommand.addListener((command) => this.onCommand(command));
    
    // Set up context menus
    this.setupContextMenus();
    
    console.log('[Edge AI] Background service initialized');
  }

  onInstalled(details) {
    if (details.reason === 'install') {
      // Set default settings
      chrome.storage.sync.set({
        language: CONFIG.languages.default,
        theme: CONFIG.ui.theme,
        fontSize: CONFIG.ui.fontSize,
        translationEnabled: CONFIG.translation.enabled,
        transcriptionEnabled: CONFIG.transcription.enabled
      });
      
      // Open welcome page
      chrome.tabs.create({ url: 'https://edge-ai.example.com/welcome' });
    } else if (details.reason === 'update') {
      console.log('[Edge AI] Updated to version', chrome.runtime.getManifest().version);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'startRecording':
          await this.startRecording(message.language);
          sendResponse({ success: true });
          break;
          
        case 'stopRecording':
          await this.stopRecording();
          sendResponse({ success: true });
          break;
          
        case 'changeLanguage':
          this.currentLanguage = message.language;
          chrome.storage.sync.set({ language: message.language });
          sendResponse({ success: true });
          break;
          
        case 'getSettings':
          const settings = await chrome.storage.sync.get(null);
          sendResponse({ settings });
          break;
          
        case 'updateSettings':
          await chrome.storage.sync.set(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'translate':
          const translation = await this.translateText(message.text, message.targetLang);
          sendResponse({ translation });
          break;
          
        case 'transcribe':
          const transcript = await this.transcribeAudio(message.audioData);
          sendResponse({ transcript });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Edge AI] Message handling error:', error);
      sendResponse({ error: error.message });
    }
    
    // Return true for async response
    return true;
  }

  async startRecording(language) {
    if (this.isRecording) return;
    
    this.currentLanguage = language || this.currentLanguage;
    this.isRecording = true;
    this.audioChunks = [];
    
    try {
      // Get audio stream from tab
      const stream = await this.getTabAudioStream();
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => this.processRecording();
      
      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      
      // Also start speech recognition if available
      this.startSpeechRecognition();
      
      this.notifyPopup({ action: 'recordingStarted', language: this.currentLanguage });
      
    } catch (error) {
      this.isRecording = false;
      throw error;
    }
  }

  async stopRecording() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    
    this.notifyPopup({ action: 'recordingStopped' });
  }

  async processRecording() {
    if (this.audioChunks.length === 0) return;
    
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioChunks = [];
    
    try {
      // Send to transcription service
      const transcript = await this.transcribeAudio(audioBlob);
      
      if (transcript) {
        this.notifyPopup({ 
          action: 'transcriptUpdate', 
          text: transcript 
        });
        
        // Auto-translate if enabled
        const settings = await chrome.storage.sync.get('translationEnabled');
        if (settings.translationEnabled && this.currentLanguage !== 'en') {
          const translation = await this.translateText(transcript, 'en');
          if (translation) {
            this.notifyPopup({
              action: 'translationUpdate',
              translation: {
                text: translation,
                language: 'en',
                originalText: transcript
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('[Edge AI] Transcription error:', error);
      this.notifyPopup({ action: 'error', error: { message: 'Transcription failed' } });
    }
  }

  startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[Edge AI] Speech recognition not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.currentLanguage;
    
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        this.notifyPopup({ action: 'transcriptUpdate', text: finalTranscript });
      } else if (interimTranscript) {
        this.notifyPopup({ action: 'interimTranscript', text: interimTranscript });
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('[Edge AI] Speech recognition error:', event.error);
    };
    
    this.recognition.start();
  }

  async getTabAudioStream() {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Request tab capture
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({
        audio: true,
        video: false
      }, (stream) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(stream);
        }
      });
    });
    
    return streamId;
  }

  async transcribeAudio(audioBlob) {
    // In a real implementation, this would send to a transcription API
    // For now, return mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('This is a mock transcription. In production, this would be sent to Whisper/Google/Azure Speech API.');
      }, 500);
    });
  }

  async translateText(text, targetLang) {
    // In a real implementation, this would call a translation API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`[${targetLang.toUpperCase()}] ${text}`);
      }, 300);
    });
  }

  notifyPopup(message) {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might not be open, that's okay
    });
  }

  onTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      // Inject content script if needed
      if (this.shouldInjectContentScript(tab.url)) {
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        }).catch(() => {});
      }
    }
  }

  shouldInjectContentScript(url) {
    // Don't inject on chrome://, edge://, about: pages
    return !url.startsWith('chrome:') && 
           !url.startsWith('edge:') && 
           !url.startsWith('about:') &&
           !url.startsWith('chrome-extension:');
  }

  onCommand(command) {
    switch (command) {
      case 'toggle-recording':
        this.toggleRecording();
        break;
      case 'open-popup':
        chrome.action.openPopup();
        break;
    }
  }

  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'translate-selection',
        title: 'Translate with Edge AI',
        contexts: ['selection']
      });
      
      chrome.contextMenus.create({
        id: 'transcribe-audio',
        title: 'Transcribe Audio',
        contexts: ['audio', 'video']
      });
    });
  }
}

// Initialize service
new BackgroundService();

export { BackgroundService };