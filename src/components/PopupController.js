/**
 * Edge AI - Popup Component
 * Main UI component for the extension popup
 */

import { CONFIG } from '../../config/config.js';
import { formatTime, debounce, copyToClipboard } from '../utils/helpers.js';

class PopupController {
  constructor() {
    this.isRecording = false;
    this.currentLanguage = CONFIG.languages.default;
    this.transcript = '';
    this.translations = [];
    this.settings = this.loadSettings();
    
    this.elements = {};
    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.applyTheme();
    this.renderLanguageOptions();
    this.updateUI();
  }

  cacheElements() {
    const ids = [
      'recordBtn', 'stopBtn', 'languageSelect', 'themeToggle',
      'transcriptContainer', 'translationContainer', 'settingsPanel',
      'settingsBtn', 'closeSettings', 'copyBtn', 'clearBtn',
      'statusIndicator', 'timer', 'wordCount', 'charCount'
    ];
    
    ids.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  bindEvents() {
    // Recording controls
    this.elements.recordBtn?.addEventListener('click', () => this.startRecording());
    this.elements.stopBtn?.addEventListener('click', () => this.stopRecording());
    
    // Language selection
    this.elements.languageSelect?.addEventListener('change', (e) => this.changeLanguage(e.target.value));
    
    // Theme toggle
    this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
    
    // Settings
    this.elements.settingsBtn?.addEventListener('click', () => this.openSettings());
    this.elements.closeSettings?.addEventListener('click', () => this.closeSettings());
    
    // Actions
    this.elements.copyBtn?.addEventListener('click', () => this.copyTranscript());
    this.elements.clearBtn?.addEventListener('click', () => this.clearTranscript());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    // Settings form
    document.querySelectorAll('[data-setting]').forEach(input => {
      input.addEventListener('change', debounce((e) => this.updateSetting(e.target), 300));
    });
  }

  handleKeyboard(e) {
    // Space to start/stop recording (when not in input)
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      e.preventDefault();
      if (this.isRecording) this.stopRecording();
      else this.startRecording();
    }
    
    // Escape to close settings
    if (e.key === 'Escape') this.closeSettings();
    
    // Ctrl/Cmd + Enter to copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.copyTranscript();
  }

  async startRecording() {
    try {
      this.isRecording = true;
      this.transcript = '';
      this.translations = [];
      this.updateUI();
      this.startTimer();
      
      // Send message to background script
      chrome.runtime.sendMessage({ action: 'startRecording', language: this.currentLanguage });
      
      this.showStatus('Recording...', 'recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.showStatus('Failed to start recording', 'error');
      this.isRecording = false;
      this.updateUI();
    }
  }

  stopRecording() {
    this.isRecording = false;
    this.stopTimer();
    
    chrome.runtime.sendMessage({ action: 'stopRecording' });
    
    this.showStatus('Ready', 'ready');
    this.updateUI();
  }

  changeLanguage(lang) {
    this.currentLanguage = lang;
    this.settings.language = lang;
    this.saveSettings();
    
    chrome.runtime.sendMessage({ action: 'changeLanguage', language: lang });
    
    this.showStatus(`Language changed to ${this.getLanguageName(lang)}`, 'info');
  }

  toggleTheme() {
    const newTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
    this.settings.theme = newTheme;
    this.saveSettings();
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    this.elements.themeToggle?.setAttribute('aria-label', 
      this.settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  openSettings() {
    this.elements.settingsPanel?.classList.add('open');
    this.elements.settingsBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  closeSettings() {
    this.elements.settingsPanel?.classList.remove('open');
    this.elements.settingsBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  updateSetting(input) {
    const key = input.dataset.setting;
    const value = input.type === 'checkbox' ? input.checked : input.value;
    this.settings[key] = value;
    this.saveSettings();
    
    // Apply certain settings immediately
    if (key === 'theme') this.applyTheme();
    if (key === 'fontSize') this.applyFontSize();
  }

  applyFontSize() {
    document.documentElement.style.fontSize = 
      this.settings.fontSize === 'small' ? '14px' :
      this.settings.fontSize === 'large' ? '18px' : '16px';
  }

  copyTranscript() {
    const text = this.transcript || this.getCombinedText();
    if (text) {
      copyToClipboard(text).then(success => {
        this.showStatus(success ? 'Copied to clipboard!' : 'Failed to copy', success ? 'success' : 'error');
      });
    }
  }

  clearTranscript() {
    this.transcript = '';
    this.translations = [];
    this.updateUI();
    this.showStatus('Transcript cleared', 'info');
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem('edge-ai-settings');
      return stored ? { ...CONFIG.ui, ...JSON.parse(stored) } : { ...CONFIG.ui };
    } catch {
      return { ...CONFIG.ui };
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('edge-ai-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  renderLanguageOptions() {
    const select = this.elements.languageSelect;
    if (!select) return;
    
    select.innerHTML = CONFIG.languages.supported.map(lang => 
      `<option value="${lang}" ${lang === this.currentLanguage ? 'selected' : ''}>
        ${this.getLanguageName(lang)}
      </option>`
    ).join('');
  }

  getLanguageName(code) {
    const names = {
      en: 'English', es: 'Spanish', fr: 'French', de: 'German',
      it: 'Italian', pt: 'Portuguese', ru: 'Russian',
      zh: 'Chinese', ja: 'Japanese', ko: 'Korean'
    };
    return names[code] || code.toUpperCase();
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimer() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    if (this.elements.timer) {
      this.elements.timer.textContent = formatTime(elapsed);
    }
  }

  showStatus(message, type = 'info') {
    const indicator = this.elements.statusIndicator;
    if (!indicator) return;
    
    indicator.textContent = message;
    indicator.className = `status-indicator status-${type}`;
    indicator.setAttribute('data-status', type);
  }

  updateUI() {
    // Update record/stop buttons
    if (this.elements.recordBtn) {
      this.elements.recordBtn.style.display = this.isRecording ? 'none' : 'inline-flex';
    }
    if (this.elements.stopBtn) {
      this.elements.stopBtn.style.display = this.isRecording ? 'inline-flex' : 'none';
    }
    
    // Update transcript
    if (this.elements.transcriptContainer) {
      this.elements.transcriptContainer.textContent = this.transcript || 'Start recording to see transcript...';
    }
    
    // Update word/char count
    const words = this.transcript.trim().split(/\s+/).filter(w => w).length;
    const chars = this.transcript.length;
    
    if (this.elements.wordCount) this.elements.wordCount.textContent = `${words} words`;
    if (this.elements.charCount) this.elements.charCount.textContent = `${chars} chars`;
    
    // Update translations
    this.renderTranslations();
  }

  renderTranslations() {
    const container = this.elements.translationContainer;
    if (!container) return;
    
    if (this.translations.length === 0) {
      container.innerHTML = '<p class="text-tertiary text-center p-4">Translations will appear here</p>';
      return;
    }
    
    container.innerHTML = this.translations.map(t => `
      <div class="card p-3 mb-2 animate-slide-up">
        <div class="flex justify-between items-start mb-1">
          <span class="badge badge-primary">${this.getLanguageName(t.language)}</span>
          <span class="text-tertiary text-xs">${formatTime(t.timestamp)}</span>
        </div>
        <p class="text-secondary">${t.text}</p>
      </div>
    `).join('');
  }

  getCombinedText() {
    return [this.transcript, ...this.translations.map(t => t.text)].join('\n\n');
  }

  // Public API for background script messages
  onTranscriptUpdate(text) {
    this.transcript = text;
    this.updateUI();
  }

  onTranslationUpdate(translation) {
    this.translations.unshift({
      ...translation,
      timestamp: Date.now()
    });
    // Keep only last 50 translations
    if (this.translations.length > 50) this.translations.pop();
    this.updateUI();
  }

  onError(error) {
    this.showStatus(error.message || 'An error occurred', 'error');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.popupController = new PopupController();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!window.popupController) return;
  
  switch (message.action) {
    case 'transcriptUpdate':
      window.popupController.onTranscriptUpdate(message.text);
      break;
    case 'translationUpdate':
      window.popupController.onTranslationUpdate(message.translation);
      break;
    case 'error':
      window.popupController.onError(message.error);
      break;
  }
});

export { PopupController };