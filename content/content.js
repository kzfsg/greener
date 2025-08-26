/**
 * Content Script for ChatGPT Token Counter
 * Monitors ChatGPT interface and tracks token usage
 */

class ChatGPTTokenTracker {
  constructor() {
    // Initialize error handler first
    this.errorHandler = window.errorHandler || new ErrorHandler();
    
    try {
      // Validate environment
      if (!this.validateEnvironment()) {
        throw new Error('Environment validation failed');
      }

      this.tokenizer = new GPTTokenizer();
      this.currentConversation = {
        id: this.generateConversationId(),
        messages: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        model: 'gpt-4o',
        startTime: Date.now()
      };
      
      this.overlay = null;
      this.isTracking = false;
      this.observers = [];
      this.initializationAttempts = 0;
      this.maxInitializationAttempts = 5;
      
      // Storage keys
      this.STORAGE_KEYS = {
        CURRENT_CONVERSATION: 'currentConversation',
        CONVERSATIONS_HISTORY: 'conversationsHistory',
        DAILY_STATS: 'dailyStats',
        SETTINGS: 'settings'
      };

      // Rate limited and debounced methods
      this.debouncedUpdateLiveTokenCount = this.errorHandler.debounce(
        this.updateLiveTokenCount.bind(this), 300
      );
      
      this.rateLimitedProcessMessages = this.errorHandler.rateLimit(
        this.processMessages.bind(this), 1000
      );
      
      this.init();
    } catch (error) {
      this.errorHandler.logError('Constructor Error', error);
      this.handleCriticalError(error);
    }
  }

  validateEnvironment() {
    // Check Chrome APIs
    if (!this.errorHandler.validateChromeAPIs()) {
      return false;
    }

    // Check domain
    if (!this.errorHandler.validateChatGPTDomain()) {
      return false;
    }

    // Check for tokenizer
    if (typeof GPTTokenizer === 'undefined') {
      this.errorHandler.logError('Missing Dependency', new Error('GPTTokenizer not loaded'));
      return false;
    }

    return true;
  }

  async init() {
    try {
      this.initializationAttempts++;
      console.log(`ChatGPT Token Counter: Initializing... (attempt ${this.initializationAttempts})`);
      
      // Check for UI changes that might affect functionality
      if (this.errorHandler.detectChatGPTUIChanges()) {
        console.warn('ChatGPT UI changes detected - some features may not work correctly');
      }

      // Load settings and data with error handling
      await this.errorHandler.safeAsync(
        () => this.loadSettings(),
        'Loading Settings'
      );
      
      await this.errorHandler.safeAsync(
        () => this.loadCurrentConversation(),
        'Loading Current Conversation'
      );
      
      // Wait for ChatGPT interface to load
      this.waitForChatInterface();
      
      // Listen for messages from popup with error handling
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.errorHandler.safeSync(
          () => this.handleMessage(message, sender, sendResponse),
          'Handling Runtime Message'
        );
      });

      // Monitor memory usage periodically
      this.startMemoryMonitoring();

    } catch (error) {
      this.errorHandler.logError('Initialization Error', error);
      
      // Retry initialization if under limit
      if (this.initializationAttempts < this.maxInitializationAttempts) {
        setTimeout(() => {
          this.init();
        }, 2000 * this.initializationAttempts); // Progressive delay
      } else {
        this.handleCriticalError(error);
      }
    }
  }

  startMemoryMonitoring() {
    setInterval(() => {
      if (this.errorHandler.isMemoryUsageHigh()) {
        this.errorHandler.logError('High Memory Usage', new Error('Memory usage exceeded 80%'));
        this.performMemoryCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  performMemoryCleanup() {
    try {
      // Clean up old message references
      if (this.currentConversation.messages.length > 100) {
        this.currentConversation.messages = this.currentConversation.messages.slice(-50);
      }

      // Clean up observers if too many
      if (this.observers.length > 10) {
        this.observers.slice(0, -5).forEach(observer => {
          observer.disconnect();
        });
        this.observers = this.observers.slice(-5);
      }

      console.log('Memory cleanup performed');
    } catch (error) {
      this.errorHandler.logError('Memory Cleanup Error', error);
    }
  }

  handleCriticalError(error) {
    console.error('Critical error in ChatGPT Token Counter:', error);
    
    // Attempt to show user-friendly error message
    this.showErrorNotification('ChatGPT Token Counter encountered an error. Please refresh the page.');
    
    // Disable functionality to prevent further errors
    this.isTracking = false;
    this.destroy();
  }

  showErrorNotification(message) {
    try {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc2626;
        color: white;
        padding: 16px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 10000);
    } catch (error) {
      // Fallback to console if DOM manipulation fails
      console.error('Error notification:', message);
    }
  }

  async loadSettings() {
    try {
      const result = await this.errorHandler.safeStorageOperation('get', 'sync', this.STORAGE_KEYS.SETTINGS);
      this.settings = result[this.STORAGE_KEYS.SETTINGS] || {
        showOverlay: true,
        overlayPosition: { x: 10, y: 10 },
        defaultModel: 'gpt-4o',
        showCosts: true,
        currency: 'USD'
      };
    } catch (error) {
      this.errorHandler.logError('Load Settings Error', error);
      // Use default settings on error
      this.settings = {
        showOverlay: true,
        overlayPosition: { x: 10, y: 10 },
        defaultModel: 'gpt-4o',
        showCosts: true,
        currency: 'USD'
      };
    }
  }

  async loadCurrentConversation() {
    try {
      const result = await this.errorHandler.safeStorageOperation('get', 'local', this.STORAGE_KEYS.CURRENT_CONVERSATION);
      if (result && result[this.STORAGE_KEYS.CURRENT_CONVERSATION]) {
        const saved = result[this.STORAGE_KEYS.CURRENT_CONVERSATION];
        
        // Validate saved conversation structure
        if (this.validateConversationData(saved)) {
          this.currentConversation = saved;
        } else {
          this.errorHandler.logError('Invalid Conversation Data', new Error('Saved conversation data is invalid'));
          this.currentConversation = this.createNewConversation();
        }
      }
    } catch (error) {
      this.errorHandler.logError('Load Conversation Error', error);
      this.currentConversation = this.createNewConversation();
    }
  }

  validateConversationData(data) {
    return data && 
           typeof data === 'object' &&
           typeof data.id === 'string' &&
           Array.isArray(data.messages) &&
           typeof data.totalInputTokens === 'number' &&
           typeof data.totalOutputTokens === 'number' &&
           typeof data.totalCost === 'number' &&
           typeof data.model === 'string' &&
           typeof data.startTime === 'number';
  }

  createNewConversation() {
    return {
      id: this.generateConversationId(),
      messages: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      model: 'gpt-4o',
      startTime: Date.now()
    };
  }

  async saveCurrentConversation() {
    try {
      // Validate data before saving
      if (!this.validateConversationData(this.currentConversation)) {
        throw new Error('Invalid conversation data - cannot save');
      }

      await this.errorHandler.safeStorageOperation('set', 'local', {
        [this.STORAGE_KEYS.CURRENT_CONVERSATION]: this.currentConversation
      });
    } catch (error) {
      this.errorHandler.logError('Save Conversation Error', error);
    }
  }

  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  waitForChatInterface() {
    const checkInterval = setInterval(() => {
      const chatContainer = this.findChatContainer();
      const inputArea = this.findInputArea();
      
      if (chatContainer && inputArea) {
        clearInterval(checkInterval);
        this.setupTracking();
      }
    }, 1000);
    
    // Stop checking after 30 seconds
    setTimeout(() => clearInterval(checkInterval), 30000);
  }

  findChatContainer() {
    // ChatGPT message container selectors (may need updates as UI changes)
    const selectors = [
      '[data-testid="conversation-turn"]',
      '.text-base',
      '[class*="conversation"]',
      '[class*="chat"]',
      'main [class*="flex-1"]',
      '[role="main"]',
      'main'
    ];
    
    const element = this.errorHandler.safeDOMQuery(selectors);
    if (element) {
      return element.closest('main') || element.parentElement;
    }
    
    this.errorHandler.logError('Chat Container Not Found', new Error('Could not locate chat container'));
    return null;
  }

  findInputArea() {
    // ChatGPT input area selectors with fallbacks
    const selectors = [
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="message"]',
      'textarea[data-id]',
      '[contenteditable="true"]',
      'textarea[rows]',
      'input[type="text"]',
      'textarea'
    ];
    
    const element = this.errorHandler.safeDOMQuery(selectors);
    if (element && this.isLikelyChatInput(element)) {
      return element;
    }
    
    this.errorHandler.logError('Input Area Not Found', new Error('Could not locate chat input area'));
    return null;
  }

  isLikelyChatInput(element) {
    const text = element.placeholder || element.textContent || '';
    return text.toLowerCase().includes('message') || 
           text.toLowerCase().includes('chat') ||
           element.tagName.toLowerCase() === 'textarea';
  }

  setupTracking() {
    console.log('ChatGPT Token Counter: Setting up tracking...');
    
    this.isTracking = true;
    
    // Create overlay
    if (this.settings.showOverlay) {
      this.createOverlay();
    }
    
    // Monitor conversation changes
    this.setupConversationObserver();
    
    // Monitor input changes
    this.setupInputObserver();
    
    // Check if this is a new conversation
    this.detectNewConversation();
    
    // Send initial state to popup
    this.sendMessageToPopup({ type: 'conversationUpdate', data: this.currentConversation });
  }

  setupConversationObserver() {
    const chatContainer = this.findChatContainer();
    if (!chatContainer) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processNewMessages(node);
          }
        });
      });
    });
    
    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(observer);
    
    // Process existing messages
    this.processExistingMessages();
  }

  setupInputObserver() {
    const inputArea = this.findInputArea();
    if (!inputArea) return;
    
    let inputTimeout;
    
    const handleInput = () => {
      this.debouncedUpdateLiveTokenCount();
    };
    
    inputArea.addEventListener('input', handleInput);
    inputArea.addEventListener('paste', handleInput);
    inputArea.addEventListener('keyup', handleInput);
  }

  processExistingMessages() {
    const messages = this.extractAllMessages();
    this.processMessages(messages);
  }

  processNewMessages(container) {
    try {
      const messages = this.extractMessagesFromContainer(container);
      if (messages.length > 0) {
        this.rateLimitedProcessMessages(messages);
      }
    } catch (error) {
      this.errorHandler.logError('Process New Messages Error', error);
    }
  }

  extractAllMessages() {
    const messages = [];
    
    // Look for message containers
    const messageSelectors = [
      '[data-message-author-role]',
      '[class*="group"]',
      '.text-base'
    ];
    
    for (const selector of messageSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const message = this.extractMessageFromElement(element);
        if (message) {
          messages.push(message);
        }
      });
    }
    
    return messages;
  }

  extractMessagesFromContainer(container) {
    const messages = [];
    const messageElements = container.querySelectorAll('[data-message-author-role], .text-base');
    
    messageElements.forEach(element => {
      const message = this.extractMessageFromElement(element);
      if (message) {
        messages.push(message);
      }
    });
    
    return messages;
  }

  extractMessageFromElement(element) {
    try {
      // Determine role
      const roleAttr = element.getAttribute('data-message-author-role');
      let role = 'user';
      
      if (roleAttr) {
        role = roleAttr;
      } else {
        // Fallback role detection
        if (element.textContent.includes('ChatGPT') || 
            element.classList.toString().includes('assistant') ||
            element.querySelector('[class*="avatar"]')) {
          role = 'assistant';
        }
      }
      
      // Extract content
      let content = '';
      const contentElement = element.querySelector('[class*="markdown"], .text-base, p');
      
      if (contentElement) {
        content = contentElement.textContent || contentElement.innerText || '';
      } else {
        content = element.textContent || element.innerText || '';
      }
      
      // Clean up content
      content = content.trim();
      if (!content || content.length < 5) return null;
      
      return {
        role,
        content,
        timestamp: Date.now(),
        element
      };
    } catch (error) {
      console.error('Error extracting message:', error);
      return null;
    }
  }

  processMessages(messages) {
    let hasNewMessages = false;
    
    messages.forEach(message => {
      // Check if message already exists
      const exists = this.currentConversation.messages.some(existing => 
        existing.content === message.content && existing.role === message.role
      );
      
      if (!exists) {
        this.currentConversation.messages.push(message);
        hasNewMessages = true;
        
        // Update token counts
        const tokens = this.tokenizer.encode(message.content, this.currentConversation.model);
        
        if (message.role === 'user') {
          this.currentConversation.totalInputTokens += tokens;
        } else if (message.role === 'assistant') {
          this.currentConversation.totalOutputTokens += tokens;
        }
      }
    });
    
    if (hasNewMessages) {
      // Update total cost
      this.currentConversation.totalCost = this.tokenizer.calculateCost(
        this.currentConversation.totalInputTokens,
        this.currentConversation.totalOutputTokens,
        this.currentConversation.model
      );
      
      // Save and update UI
      this.saveCurrentConversation();
      this.updateOverlay();
      this.sendMessageToPopup({ type: 'conversationUpdate', data: this.currentConversation });
    }
  }

  updateLiveTokenCount() {
    const inputArea = this.findInputArea();
    if (!inputArea) return;
    
    const text = inputArea.value || inputArea.textContent || '';
    const tokens = this.tokenizer.encode(text, this.currentConversation.model);
    
    this.sendMessageToPopup({ 
      type: 'liveTokenUpdate', 
      data: { 
        text, 
        tokens,
        characters: text.length
      } 
    });
    
    this.updateOverlay({ liveTokens: tokens });
  }

  detectNewConversation() {
    const url = window.location.href;
    const conversationMatch = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    
    if (conversationMatch && conversationMatch[1] !== this.currentConversation.urlId) {
      // New conversation detected
      this.startNewConversation(conversationMatch[1]);
    } else if (!conversationMatch && this.currentConversation.urlId) {
      // Moved to home page or new chat
      this.startNewConversation();
    }
  }

  startNewConversation(urlId = null) {
    console.log('Starting new conversation:', urlId);
    
    // Save current conversation to history
    if (this.currentConversation.messages.length > 0) {
      this.saveConversationToHistory();
    }
    
    // Create new conversation
    this.currentConversation = {
      id: this.generateConversationId(),
      urlId: urlId,
      messages: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      model: this.detectCurrentModel(),
      startTime: Date.now()
    };
    
    this.saveCurrentConversation();
    this.updateOverlay();
    this.sendMessageToPopup({ type: 'conversationUpdate', data: this.currentConversation });
  }

  async saveConversationToHistory() {
    const result = await chrome.storage.local.get(this.STORAGE_KEYS.CONVERSATIONS_HISTORY);
    const history = result[this.STORAGE_KEYS.CONVERSATIONS_HISTORY] || [];
    
    // Add current conversation to history
    history.push({
      ...this.currentConversation,
      endTime: Date.now()
    });
    
    // Keep only last 100 conversations
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    await chrome.storage.local.set({
      [this.STORAGE_KEYS.CONVERSATIONS_HISTORY]: history
    });
  }

  detectCurrentModel() {
    // Try to detect model from UI elements
    const modelIndicators = document.querySelectorAll('[class*="model"], [class*="gpt"]');
    
    for (const element of modelIndicators) {
      const text = element.textContent.toLowerCase();
      const model = this.tokenizer.detectModel(text);
      if (model !== this.tokenizer.defaultModel) {
        return model;
      }
    }
    
    return this.settings.defaultModel;
  }

  createOverlay() {
    if (this.overlay) {
      this.overlay.remove();
    }
    
    this.overlay = document.createElement('div');
    this.overlay.id = 'chatgpt-token-counter-overlay';
    this.overlay.innerHTML = `
      <div class="token-counter-header">
        <span class="token-counter-title">Tokens</span>
        <button class="token-counter-toggle" title="Toggle visibility">−</button>
      </div>
      <div class="token-counter-content">
        <div class="token-counter-stats">
          <div class="stat-item">
            <span class="stat-label">Input:</span>
            <span class="stat-value" id="input-tokens">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Output:</span>
            <span class="stat-value" id="output-tokens">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total:</span>
            <span class="stat-value" id="total-tokens">0</span>
          </div>
          <div class="stat-item" id="cost-item">
            <span class="stat-label">Cost:</span>
            <span class="stat-value" id="cost">$0.00</span>
          </div>
        </div>
        <div class="token-counter-live" id="live-tokens" style="display: none;">
          <span class="stat-label">Typing:</span>
          <span class="stat-value">0</span>
        </div>
      </div>
    `;
    
    // Position overlay
    this.overlay.style.left = this.settings.overlayPosition.x + 'px';
    this.overlay.style.top = this.settings.overlayPosition.y + 'px';
    
    // Make draggable
    this.makeOverlayDraggable();
    
    // Add toggle functionality
    const toggleButton = this.overlay.querySelector('.token-counter-toggle');
    const content = this.overlay.querySelector('.token-counter-content');
    let isCollapsed = false;
    
    toggleButton.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      content.style.display = isCollapsed ? 'none' : 'block';
      toggleButton.textContent = isCollapsed ? '+' : '−';
    });
    
    document.body.appendChild(this.overlay);
    this.updateOverlay();
  }

  makeOverlayDraggable() {
    const header = this.overlay.querySelector('.token-counter-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    header.addEventListener('mousedown', (e) => {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      
      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        xOffset = currentX;
        yOffset = currentY;
        
        this.overlay.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        
        // Save position
        const rect = this.overlay.getBoundingClientRect();
        this.settings.overlayPosition = { x: rect.left, y: rect.top };
        chrome.storage.sync.set({ [this.STORAGE_KEYS.SETTINGS]: this.settings });
      }
    });
  }

  updateOverlay(data = {}) {
    if (!this.overlay) return;
    
    const inputTokensEl = this.overlay.querySelector('#input-tokens');
    const outputTokensEl = this.overlay.querySelector('#output-tokens');
    const totalTokensEl = this.overlay.querySelector('#total-tokens');
    const costEl = this.overlay.querySelector('#cost');
    const liveTokensEl = this.overlay.querySelector('#live-tokens');
    
    if (inputTokensEl) inputTokensEl.textContent = this.currentConversation.totalInputTokens;
    if (outputTokensEl) outputTokensEl.textContent = this.currentConversation.totalOutputTokens;
    if (totalTokensEl) totalTokensEl.textContent = this.currentConversation.totalInputTokens + this.currentConversation.totalOutputTokens;
    if (costEl && this.settings.showCosts) {
      costEl.textContent = '$' + this.currentConversation.totalCost.toFixed(4);
    }
    
    // Show live tokens if provided
    if (data.liveTokens !== undefined) {
      if (liveTokensEl) {
        liveTokensEl.style.display = data.liveTokens > 0 ? 'block' : 'none';
        liveTokensEl.querySelector('.stat-value').textContent = data.liveTokens;
      }
    }
  }

  sendMessageToPopup(message) {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might not be open, which is fine
    });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'getConversationData':
        sendResponse({
          conversation: this.currentConversation,
          isTracking: this.isTracking
        });
        break;
        
      case 'resetConversation':
        this.startNewConversation();
        sendResponse({ success: true });
        break;
        
      case 'toggleOverlay':
        if (this.overlay) {
          this.overlay.style.display = this.overlay.style.display === 'none' ? 'block' : 'none';
        }
        sendResponse({ success: true });
        break;
        
      case 'updateSettings':
        this.settings = { ...this.settings, ...message.settings };
        chrome.storage.sync.set({ [this.STORAGE_KEYS.SETTINGS]: this.settings });
        sendResponse({ success: true });
        break;
    }
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    if (this.overlay) {
      this.overlay.remove();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ChatGPTTokenTracker();
  });
} else {
  new ChatGPTTokenTracker();
}

// Handle page navigation
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Reinitialize on navigation
    setTimeout(() => {
      new ChatGPTTokenTracker();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });