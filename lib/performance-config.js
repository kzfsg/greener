/**
 * Performance Configuration and Optimization
 * For ChatGPT Token Counter Extension
 */

class PerformanceManager {
  constructor() {
    this.config = {
      // Update intervals (milliseconds)
      updateIntervals: {
        normal: 2000,          // Normal mode
        performance: 5000,     // Performance mode
        liveCounter: 300,      // Live token counting
        memoryCheck: 30000     // Memory usage check
      },
      
      // Thresholds
      thresholds: {
        memoryUsage: 80,       // % of heap limit
        messageBatchSize: 10,   // Max messages to process at once
        maxObservers: 5,       // Max MutationObservers
        maxRetries: 3,         // Max retry attempts
        tokenHistoryLimit: 100 // Max tokens to keep in memory
      },
      
      // Performance optimizations
      optimizations: {
        useRequestIdleCallback: true,
        enableLazyLoading: true,
        enableBatching: true,
        enableCaching: true,
        enableDebouncing: true,
        enableRateLimit: true
      },
      
      // Debounce delays
      debounceDelays: {
        tokenCount: 300,
        domUpdate: 100,
        storage: 1000,
        uiRefresh: 500
      },
      
      // Cache settings
      cache: {
        tokenResults: 1000,    // Cache token calculation results
        domQueries: 100,       // Cache DOM query results
        ttl: 60000            // Cache TTL in milliseconds
      }
    };
    
    this.metrics = {
      tokenCalculations: 0,
      domQueries: 0,
      storageOperations: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    this.cache = new Map();
    this.debouncedFunctions = new Map();
    this.rateLimitedFunctions = new Map();
    
    this.initializeOptimizations();
  }

  initializeOptimizations() {
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    
    // Initialize caches
    this.initializeCaches();
    
    // Set up cleanup intervals
    this.setupCleanupIntervals();
  }

  setupPerformanceMonitoring() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 100) { // Log slow operations
              console.warn('Slow operation detected:', {
                name: entry.name,
                duration: entry.duration,
                type: entry.entryType
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.log('Performance Observer not available:', error);
      }
    }
  }

  initializeCaches() {
    // Token calculation cache
    this.tokenCache = new Map();
    
    // DOM element cache
    this.domCache = new Map();
    
    // Storage result cache
    this.storageCache = new Map();
  }

  setupCleanupIntervals() {
    // Clean caches periodically
    setInterval(() => {
      this.cleanupCaches();
    }, this.config.cache.ttl);
    
    // Clean up debounced functions
    setInterval(() => {
      this.cleanupDebouncedFunctions();
    }, 300000); // 5 minutes
  }

  // Token calculation optimization
  optimizeTokenCalculation(text, model) {
    const cacheKey = `${model}:${text.length}:${this.hashString(text)}`;
    
    if (this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey);
    }
    
    // Use requestIdleCallback for non-critical calculations
    if (this.config.optimizations.useRequestIdleCallback && window.requestIdleCallback) {
      return new Promise(resolve => {
        requestIdleCallback(() => {
          const result = this.calculateTokensInternal(text, model);
          this.tokenCache.set(cacheKey, result);
          this.metrics.tokenCalculations++;
          resolve(result);
        });
      });
    }
    
    const result = this.calculateTokensInternal(text, model);
    this.tokenCache.set(cacheKey, result);
    this.metrics.tokenCalculations++;
    
    return result;
  }

  calculateTokensInternal(text, model) {
    // This would be the actual token calculation
    // For now, return the existing tokenizer result
    if (window.GPTTokenizer) {
      const tokenizer = new window.GPTTokenizer();
      return tokenizer.encode(text, model);
    }
    
    // Fallback calculation
    return Math.ceil(text.length / 4);
  }

  // DOM optimization
  optimizeDOMQuery(selectors, context = document) {
    if (!Array.isArray(selectors)) {
      selectors = [selectors];
    }
    
    const cacheKey = selectors.join('|') + (context !== document ? context.tagName : 'doc');
    
    if (this.domCache.has(cacheKey)) {
      const cached = this.domCache.get(cacheKey);
      if (document.contains(cached.element)) {
        return cached.element;
      } else {
        this.domCache.delete(cacheKey);
      }
    }
    
    for (const selector of selectors) {
      try {
        const element = context.querySelector(selector);
        if (element) {
          this.domCache.set(cacheKey, {
            element,
            timestamp: Date.now()
          });
          this.metrics.domQueries++;
          return element;
        }
      } catch (error) {
        console.warn('DOM query error:', selector, error);
      }
    }
    
    return null;
  }

  // Batch processing optimization
  createBatchProcessor(processingFunction, batchSize = 10, delay = 100) {
    let batch = [];
    let timeoutId = null;
    
    return (item) => {
      batch.push(item);
      
      if (batch.length >= batchSize) {
        this.processBatch(batch, processingFunction);
        batch = [];
        if (timeoutId) clearTimeout(timeoutId);
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          if (batch.length > 0) {
            this.processBatch(batch, processingFunction);
            batch = [];
          }
          timeoutId = null;
        }, delay);
      }
    };
  }

  processBatch(batch, processingFunction) {
    try {
      if (window.requestIdleCallback && this.config.optimizations.useRequestIdleCallback) {
        requestIdleCallback(() => {
          processingFunction(batch);
        });
      } else {
        processingFunction(batch);
      }
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }

  // Enhanced debounce with performance tracking
  debounce(func, delay, key = null) {
    if (!key) key = func.name || 'anonymous';
    
    if (this.debouncedFunctions.has(key)) {
      return this.debouncedFunctions.get(key);
    }
    
    let timeoutId = null;
    let lastCall = 0;
    
    const debouncedFunc = (...args) => {
      const now = Date.now();
      lastCall = now;
      
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        if (Date.now() - lastCall >= delay - 10) { // Small buffer
          func.apply(this, args);
        }
      }, delay);
    };
    
    debouncedFunc.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
    
    this.debouncedFunctions.set(key, debouncedFunc);
    return debouncedFunc;
  }

  // Enhanced rate limiting
  rateLimit(func, interval, key = null) {
    if (!key) key = func.name || 'anonymous';
    
    if (this.rateLimitedFunctions.has(key)) {
      return this.rateLimitedFunctions.get(key);
    }
    
    let lastCall = 0;
    let timeoutId = null;
    
    const rateLimitedFunc = (...args) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall >= interval) {
        lastCall = now;
        func.apply(this, args);
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          func.apply(this, args);
          timeoutId = null;
        }, interval - timeSinceLastCall);
      }
    };
    
    this.rateLimitedFunctions.set(key, rateLimitedFunc);
    return rateLimitedFunc;
  }

  // Memory optimization
  optimizeMemoryUsage() {
    // Clear caches if memory usage is high
    if (this.isMemoryUsageHigh()) {
      this.cleanupCaches();
      this.forceGarbageCollection();
    }
    
    // Clean up old DOM references
    this.cleanupDOMReferences();
    
    // Clean up event listeners
    this.cleanupEventListeners();
  }

  isMemoryUsageHigh() {
    if (performance.memory) {
      const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      return usage > (this.config.thresholds.memoryUsage / 100);
    }
    return false;
  }

  forceGarbageCollection() {
    // Force garbage collection if available (dev tools)
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
        console.log('Garbage collection forced');
      } catch (error) {
        console.log('Garbage collection not available');
      }
    }
  }

  cleanupCaches() {
    const now = Date.now();
    
    // Clean token cache
    for (const [key, value] of this.tokenCache.entries()) {
      if (typeof value === 'object' && value.timestamp) {
        if (now - value.timestamp > this.config.cache.ttl) {
          this.tokenCache.delete(key);
        }
      }
    }
    
    // Clean DOM cache
    for (const [key, value] of this.domCache.entries()) {
      if (now - value.timestamp > this.config.cache.ttl) {
        this.domCache.delete(key);
      }
    }
    
    // Limit cache sizes
    if (this.tokenCache.size > this.config.cache.tokenResults) {
      const entries = Array.from(this.tokenCache.entries());
      entries.slice(0, entries.length - this.config.cache.tokenResults)
        .forEach(([key]) => this.tokenCache.delete(key));
    }
  }

  cleanupDOMReferences() {
    // Remove references to detached DOM elements
    for (const [key, value] of this.domCache.entries()) {
      if (!document.contains(value.element)) {
        this.domCache.delete(key);
      }
    }
  }

  cleanupEventListeners() {
    // This would clean up any orphaned event listeners
    // Implementation depends on how listeners are tracked
  }

  cleanupDebouncedFunctions() {
    // Cancel any pending debounced functions
    for (const [key, func] of this.debouncedFunctions.entries()) {
      if (func.cancel) {
        func.cancel();
      }
    }
  }

  // Utility methods
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  // Performance metrics
  getMetrics() {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;
    
    return {
      ...this.metrics,
      uptime,
      cacheHitRates: {
        token: this.tokenCache.size,
        dom: this.domCache.size
      },
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    };
  }

  // Configuration methods
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  enablePerformanceMode() {
    this.config.updateIntervals = {
      ...this.config.updateIntervals,
      normal: this.config.updateIntervals.performance
    };
    
    this.config.optimizations = {
      ...this.config.optimizations,
      useRequestIdleCallback: true,
      enableBatching: true,
      enableCaching: true
    };
    
    console.log('Performance mode enabled');
  }

  disablePerformanceMode() {
    this.config.updateIntervals.normal = 2000;
    console.log('Performance mode disabled');
  }
}

// Make PerformanceManager available globally
window.PerformanceManager = PerformanceManager;

// Create global instance
window.performanceManager = new PerformanceManager();