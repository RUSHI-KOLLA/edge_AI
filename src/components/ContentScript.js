/**
 * Edge AI - Content Script
 * Injected into web pages for transcription and translation
 */

class ContentScript {
  constructor() {
    this.isActive = false;
    this.transcriptContainer = null;
    this.translationContainer = null;
    this.observer = null;
    
    this.init();
  }

  init() {
    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => 
      this.handleMessage(message, sender, sendResponse)
    );
    
    // Create UI containers
    this.createUI();
    
    // Observe DOM changes for dynamic content
    this.observeDOM();
    
    console.log('[Edge AI] Content script loaded');
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'startTranscription':
        this.startTranscription(message.config);
        sendResponse({ success: true });
        break;
        
      case 'stopTranscription':
        this.stopTranscription();
        sendResponse({ success: true });
        break;
        
      case 'showTranslation':
        this.showTranslation(message.translation);
        sendResponse({ success: true });
        break;
        
      case 'hideUI':
        this.hideUI();
        sendResponse({ success: true });
        break;
        
      case 'getPageText':
        const text = this.getPageText();
        sendResponse({ text });
        break;
        
      case 'translateSelection':
        this.translateSelection(message.targetLang);
        sendResponse({ success: true });
        break;
    }
    
    return true;
  }

  createUI() {
    // Create transcript overlay
    this.transcriptContainer = document.createElement('div');
    this.transcriptContainer.id = 'edge-ai-transcript';
    this.transcriptContainer.className = 'edge-ai-overlay';
    this.transcriptContainer.innerHTML = `
      <div class="edge-ai-header">
        <span class="edge-ai-title">Edge AI Transcript</span>
        <button class="edge-ai-close" aria-label="Close">&times;</button>
      </div>
      <div class="edge-ai-content"></div>
    `;
    
    // Create translation tooltip
    this.translationContainer = document.createElement('div');
    this.translationContainer.id = 'edge-ai-translation';
    this.translationContainer.className = 'edge-ai-tooltip';
    this.translationContainer.style.display = 'none';
    
    // Add styles
    this.injectStyles();
    
    // Add to page
    document.body.appendChild(this.transcriptContainer);
    document.body.appendChild(this.translationContainer);
    
    // Bind close button
    this.transcriptContainer.querySelector('.edge-ai-close').addEventListener('click', () => {
      this.hideUI();
      chrome.runtime.sendMessage({ action: 'uiClosed' });
    });
    
    // Make draggable
    this.makeDraggable(this.transcriptContainer);
  }

  injectStyles() {
    const style = document.createElement('style');
    style.id = 'edge-ai-styles';
    style.textContent = `
      .edge-ai-overlay {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        max-height: 500px;
        background: var(--edge-ai-bg, #fff);
        border: 1px solid var(--edge-ai-border, #e2e8f0);
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: var(--edge-ai-text, #0f172a);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      
      .edge-ai-overlay.visible {
        display: flex;
        animation: edge-ai-slide-up 0.3s ease;
      }
      
      @keyframes edge-ai-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .edge-ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--edge-ai-border, #e2e8f0);
        background: var(--edge-ai-header-bg, #f8fafc);
        cursor: move;
      }
      
      .edge-ai-title {
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--edge-ai-text-secondary, #64748b);
      }
      
      .edge-ai-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--edge-ai-text-tertiary, #94a3b8);
        padding: 0;
        line-height: 1;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      
      .edge-ai-close:hover {
        background: var(--edge-ai-hover, #e2e8f0);
        color: var(--edge-ai-text, #0f172a);
      }
      
      .edge-ai-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        max-height: 400px;
      }
      
      .edge-ai-transcript-item {
        margin-bottom: 12px;
        padding: 10px 12px;
        background: var(--edge-ai-item-bg, #f1f5f9);
        border-radius: 8px;
        animation: edge-ai-fade-in 0.2s ease;
      }
      
      @keyframes edge-ai-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .edge-ai-transcript-text {
        margin-bottom: 4px;
      }
      
      .edge-ai-transcript-meta {
        display: flex;
        gap: 8px;
        font-size: 11px;
        color: var(--edge-ai-text-tertiary, #94a3b8);
      }
      
      .edge-ai-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .edge-ai-badge.final { background: #dcfce7; color: #166534; }
      .edge-ai-badge.interim { background: #fef3c7; color: #92400e; }
      
      .edge-ai-tooltip {
        position: fixed;
        max-width: 300px;
        padding: 12px 16px;
        background: var(--edge-ai-bg, #fff);
        border: 1px solid var(--edge-ai-border, #e2e8f0);
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.5;
        color: var(--edge-ai-text, #0f172a);
        pointer-events: none;
      }
      
      .edge-ai-tooltip::before {
        content: '';
        position: absolute;
        top: -6px;
        left: 20px;
        width: 12px;
        height: 12px;
        background: var(--edge-ai-bg, #fff);
        border-left: 1px solid var(--edge-ai-border, #e2e8f0);
        border-top: 1px solid var(--edge-ai-border, #e2e8f0);
        transform: rotate(45deg);
      }
      
      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .edge-ai-overlay {
          --edge-ai-bg: #1e293b;
          --edge-ai-border: #334155;
          --edge-ai-text: #f8fafc;
          --edge-ai-text-secondary: #94a3b8;
          --edge-ai-text-tertiary: #64748b;
          --edge-ai-header-bg: #0f172a;
          --edge-ai-hover: #334155;
          --edge-ai-item-bg: #334155;
        }
      }
      
      /* Selection highlight */
      .edge-ai-selection-highlight {
        background: rgba(59, 130, 246, 0.2);
        border-radius: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  makeDraggable(element) {
    const handle = element.querySelector('.edge-ai-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    handle.addEventListener('mousedown', (e) => {
      if (e.target === handle.querySelector('.edge-ai-close')) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = element.offsetLeft;
      startTop = element.offsetTop;
      
      element.style.transition = 'none';
      document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      element.style.left = `${startLeft + dx}px`;
      element.style.top = `${startTop + dy}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.transition = '';
        document.body.style.userSelect = '';
      }
    });
  }

  showUI() {
    this.transcriptContainer.classList.add('visible');
    this.isActive = true;
  }

  hideUI() {
    this.transcriptContainer.classList.remove('visible');
    this.translationContainer.style.display = 'none';
    this.isActive = false;
  }

  addTranscript(text, isFinal = true, language = 'en') {
    const content = this.transcriptContainer.querySelector('.edge-ai-content');
    const item = document.createElement('div');
    item.className = 'edge-ai-transcript-item';
    item.innerHTML = `
      <div class="edge-ai-transcript-text">${this.escapeHtml(text)}</div>
      <div class="edge-ai-transcript-meta">
        <span class="edge-ai-badge ${isFinal ? 'final' : 'interim'}">
          ${isFinal ? 'Final' : 'Live'}
        </span>
        <span>${language.toUpperCase()}</span>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
    `;
    
    content.appendChild(item);
    content.scrollTop = content.scrollHeight;
    
    // Limit items
    const items = content.querySelectorAll('.edge-ai-transcript-item');
    if (items.length > 50) {
      items[0].remove();
    }
  }

  showTranslation(translation) {
    this.translationContainer.textContent = translation;
    this.translationContainer.style.display = 'block';
    
    // Position near selection or center
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      this.translationContainer.style.left = `${rect.left + window.scrollX}px`;
      this.translationContainer.style.top = `${rect.bottom + window.scrollY + 8}px`;
    }
  }

  hideTranslation() {
    this.translationContainer.style.display = 'none';
  }

  startTranscription(config) {
    this.showUI();
    // Transcription logic would go here
    console.log('[Edge AI] Transcription started with config:', config);
  }

  stopTranscription() {
    this.hideUI();
    console.log('[Edge AI] Transcription stopped');
  }

  translateSelection(targetLang) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text) {
      chrome.runtime.sendMessage({
        action: 'translate',
        text,
        targetLang
      }, (response) => {
        if (response?.translation) {
          this.showTranslation(response.translation);
        }
      });
    }
  }

  getPageText() {
    // Get readable text from page
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return NodeFilter.FILTER_REJECT;
          }
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'iframe', 'svg', 'canvas'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let text = '';
    let node;
    while (node = walker.nextNode()) {
      const trimmed = node.textContent.trim();
      if (trimmed.length > 10) {
        text += trimmed + ' ';
      }
    }
    
    return text.trim();
  }

  observeDOM() {
    this.observer = new MutationObserver((mutations) => {
      // Handle dynamic content changes if needed
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ContentScript());
} else {
  new ContentScript();
}

export { ContentScript };