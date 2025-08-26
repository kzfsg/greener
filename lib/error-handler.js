/**
 * Comprehensive Error Handling and Edge Case Management
 * For ChatGPT Token Counter Extension
 */

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.retryAttempts = {};
    this.maxRetries = 3;
    
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.logError('Unhandled Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason);
      event.preventDefault(); // Prevent console spam
    });
  }

  /**
   * Log error with context
   * @param {string} category - Error category
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context
   */
  logError(category, error, context = {}) {
    const errorEntry = {
      timestamp: Date.now(),
      category,
      message: error?.message || error,
      stack: error?.stack,
      context,
      url: window.location.href
    };

    this.errorLog.push(errorEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (this.isDebugMode()) {
      console.error(`[${category}]`, error, context);
    }

    // Report critical errors
    if (this.isCriticalError(category)) {
      this.reportCriticalError(errorEntry);
    }
  }

  /**
   * Retry a function with exponential backoff
   * @param {string} key - Unique key for retry tracking
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise} Result of function execution
   */
  async retryWithBackoff(key, fn, maxRetries = this.maxRetries) {
    const attempt = (this.retryAttempts[key] || 0) + 1;
    this.retryAttempts[key] = attempt;

    try {
      const result = await fn();
      // Reset retry count on success
      delete this.retryAttempts[key];
      return result;
    } catch (error) {
      if (attempt >= maxRetries) {
        delete this.retryAttempts[key];
        throw new Error(`Max retries (${maxRetries}) exceeded for ${key}: ${error.message}`);
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await this.sleep(delay);

      this.logError('Retry Attempt', error, { key, attempt, delay });
      return this.retryWithBackoff(key, fn, maxRetries);
    }
  }

  /**
   * Safe async wrapper that catches and logs errors
   * @param {Function} fn - Async function to wrap
   * @param {string} context - Context description
   * @param {any} defaultValue - Default value on error
   * @returns {Promise} Result or default value
   */
  async safeAsync(fn, context, defaultValue = null) {
    try {
      return await fn();
    } catch (error) {
      this.logError('Safe Async Error', error, { context });
      return defaultValue;
    }
  }

  /**
   * Safe sync wrapper that catches and logs errors
   * @param {Function} fn - Function to wrap
   * @param {string} context - Context description
   * @param {any} defaultValue - Default value on error
   * @returns {any} Result or default value
   */
  safeSync(fn, context, defaultValue = null) {
    try {
      return fn();
    } catch (error) {
      this.logError('Safe Sync Error', error, { context });
      return defaultValue;
    }
  }

  /**
   * Validate Chrome extension APIs are available
   * @returns {boolean} True if APIs are available
   */
  validateChromeAPIs() {
    const requiredAPIs = ['chrome.storage', 'chrome.runtime', 'chrome.tabs'];
    const missing = [];

    for (const api of requiredAPIs) {
      if (!this.getNestedProperty(window, api)) {
        missing.push(api);
      }
    }

    if (missing.length > 0) {
      this.logError('Missing Chrome APIs', new Error(`Missing APIs: ${missing.join(', ')}`));
      return false;
    }

    return true;
  }

  /**
   * Check if we're on a supported ChatGPT domain
   * @returns {boolean} True if on supported domain
   */
  validateChatGPTDomain() {
    const supportedDomains = ['chat.openai.com', 'chatgpt.com'];
    const currentDomain = window.location.hostname;
    
    const isSupported = supportedDomains.some(domain => 
      currentDomain === domain || currentDomain.endsWith('.' + domain)
    );

    if (!isSupported) {
      this.logError('Unsupported Domain', new Error(`Domain ${currentDomain} not supported`));
    }

    return isSupported;
  }

  /**
   * Validate DOM element exists and is accessible
   * @param {Element} element - DOM element to validate
   * @param {string} selector - Original selector used
   * @returns {boolean} True if element is valid
   */
  validateElement(element, selector) {
    if (!element) {
      this.logError('Element Not Found', new Error(`Element not found: ${selector}`));
      return false;
    }

    if (!document.contains(element)) {
      this.logError('Element Detached', new Error(`Element detached from DOM: ${selector}`));
      return false;
    }

    return true;
  }

  /**
   * Safe DOM query with fallback selectors
   * @param {Array<string>} selectors - Array of selectors to try
   * @param {Element} context - Context element (default: document)
   * @returns {Element|null} Found element or null
   */
  safeDOMQuery(selectors, context = document) {
    for (const selector of selectors) {
      try {
        const element = context.querySelector(selector);
        if (element && this.validateElement(element, selector)) {
          return element;
        }
      } catch (error) {
        this.logError('DOM Query Error', error, { selector });
      }
    }
    return null;
  }

  /**
   * Safe storage operation with retry logic
   * @param {string} operation - 'get', 'set', 'remove'
   * @param {string} area - 'local' or 'sync'
   * @param {any} data - Data for the operation
   * @returns {Promise} Operation result
   */
  async safeStorageOperation(operation, area, data) {
    return this.retryWithBackoff(`storage_${operation}_${area}`, async () => {
      const storage = chrome.storage[area];
      if (!storage) {
        throw new Error(`Chrome storage.${area} not available`);
      }

      switch (operation) {
        case 'get':
          return new Promise((resolve, reject) => {
            storage.get(data, (result) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(result);
              }
            });
          });

        case 'set':
          return new Promise((resolve, reject) => {
            storage.set(data, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });

        case 'remove':
          return new Promise((resolve, reject) => {
            storage.remove(data, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });

        default:
          throw new Error(`Unsupported storage operation: ${operation}`);
      }
    });
  }

  /**
   * Check if ChatGPT interface has changed (detection patterns)
   * @returns {boolean} True if interface appears to have changed
   */
  detectChatGPTUIChanges() {
    const expectedElements = [
      'main', 'textarea', '[contenteditable]',
      '[class*="conversation"]', '[class*="message"]'
    ];

    let foundElements = 0;
    for (const selector of expectedElements) {
      if (document.querySelector(selector)) {
        foundElements++;
      }
    }

    // If less than 50% of expected elements are found, UI likely changed
    const threshold = Math.ceil(expectedElements.length * 0.5);
    const uiChanged = foundElements < threshold;

    if (uiChanged) {
      this.logError('UI Change Detected', new Error('ChatGPT interface appears to have changed'), {
        foundElements,
        expectedElements: expectedElements.length,
        threshold
      });
    }

    return uiChanged;
  }

  /**
   * Rate limit function calls
   * @param {Function} fn - Function to rate limit
   * @param {number} delay - Minimum delay between calls (ms)
   * @returns {Function} Rate limited function
   */
  rateLimit(fn, delay = 1000) {
    let lastCall = 0;
    let timeout = null;

    return (...args) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;

      if (timeSinceLastCall >= delay) {
        lastCall = now;
        return fn.apply(this, args);
      } else {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          lastCall = Date.now();
          fn.apply(this, args);
        }, delay - timeSinceLastCall);
      }
    };
  }

  /**
   * Debounce function calls
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Debounce delay (ms)
   * @returns {Function} Debounced function
   */
  debounce(fn, delay = 300) {
    let timeout = null;

    return (...args) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Memory usage monitoring
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        percentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }

  /**
   * Check if memory usage is concerning
   * @returns {boolean} True if memory usage is high
   */
  isMemoryUsageHigh() {
    const usage = this.getMemoryUsage();
    return usage && usage.percentage > 80;
  }

  // Utility methods
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  isDebugMode() {
    return window.localStorage?.getItem('chatgpt-token-counter-debug') === 'true';
  }

  isCriticalError(category) {
    const criticalCategories = [
      'Chrome API Error',
      'Storage Error',
      'Memory Error',
      'Unhandled Error'
    ];
    return criticalCategories.includes(category);
  }

  async reportCriticalError(errorEntry) {
    try {
      // Store critical error for later reporting
      const criticalErrors = JSON.parse(
        localStorage.getItem('chatgpt-token-counter-critical-errors') || '[]'
      );
      
      criticalErrors.push(errorEntry);
      
      // Keep only last 10 critical errors
      if (criticalErrors.length > 10) {
        criticalErrors.shift();
      }
      
      localStorage.setItem(
        'chatgpt-token-counter-critical-errors',
        JSON.stringify(criticalErrors)
      );
    } catch (error) {
      console.error('Failed to store critical error:', error);
    }
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    const recentErrors = this.errorLog.filter(error => 
      now - error.timestamp < oneHour
    );

    const dailyErrors = this.errorLog.filter(error => 
      now - error.timestamp < oneDay
    );

    const errorsByCategory = this.errorLog.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {});

    return {
      total: this.errorLog.length,
      recentHour: recentErrors.length,
      dailyCount: dailyErrors.length,
      byCategory: errorsByCategory,
      retryAttempts: { ...this.retryAttempts }
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    this.retryAttempts = {};
  }
}

// Make ErrorHandler available globally
window.ErrorHandler = ErrorHandler;

// Create global instance
window.errorHandler = new ErrorHandler();