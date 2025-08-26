/**
 * Options Page Script for ChatGPT Token Counter
 * Handles settings management and UI interactions
 */

class OptionsPage {
  constructor() {
    this.settings = {};
    this.currentSection = 'display';
    
    this.STORAGE_KEYS = {
      SETTINGS: 'settings',
      CONVERSATIONS_HISTORY: 'conversationsHistory',
      DAILY_STATS: 'dailyStats'
    };
    
    this.defaultSettings = {
      showOverlay: true,
      overlayPosition: { x: 10, y: 10 },
      defaultModel: 'gpt-4o',
      showCosts: true,
      currency: 'USD',
      theme: 'auto',
      autoExport: false,
      exportInterval: 'weekly',
      notifications: true,
      contextWarnings: true,
      costWarnings: true,
      costThreshold: 1.0,
      showLiveCounter: true,
      autoDetectModel: true,
      includeSystemTokens: true,
      contextThreshold: 80,
      sessionSummaries: true,
      updateInterval: 2,
      debugMode: false,
      performanceMode: false,
      estimationMethod: 'balanced',
      customCSS: ''
    };
    
    this.init();
  }

  async init() {
    console.log('Options Page: Initializing...');
    
    // Load current settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI with current settings
    this.updateUI();
    
    // Apply theme
    this.applyTheme();
    
    // Load storage usage
    this.updateStorageUsage();
    
    // Set version info
    this.setVersionInfo();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEYS.SETTINGS);
      this.settings = { ...this.defaultSettings, ...(result[this.STORAGE_KEYS.SETTINGS] || {}) };
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchSection(e.target.dataset.section);
      });
    });

    // Save and Reset buttons
    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });
    
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });

    // Display settings
    document.getElementById('show-overlay').addEventListener('change', (e) => {
      this.settings.showOverlay = e.target.checked;
    });
    
    document.getElementById('theme-select').addEventListener('change', (e) => {
      this.settings.theme = e.target.value;
      this.applyTheme();
    });
    
    document.getElementById('overlay-x').addEventListener('change', (e) => {
      this.settings.overlayPosition.x = parseInt(e.target.value);
    });
    
    document.getElementById('overlay-y').addEventListener('change', (e) => {
      this.settings.overlayPosition.y = parseInt(e.target.value);
    });
    
    document.getElementById('reset-position').addEventListener('click', () => {
      this.settings.overlayPosition = { x: 10, y: 10 };
      this.updateUI();
    });
    
    document.getElementById('show-live-counter').addEventListener('change', (e) => {
      this.settings.showLiveCounter = e.target.checked;
    });

    // Token counting settings
    document.getElementById('default-model').addEventListener('change', (e) => {
      this.settings.defaultModel = e.target.value;
    });
    
    document.getElementById('auto-detect-model').addEventListener('change', (e) => {
      this.settings.autoDetectModel = e.target.checked;
    });
    
    document.getElementById('include-system-tokens').addEventListener('change', (e) => {
      this.settings.includeSystemTokens = e.target.checked;
    });

    // Cost settings
    document.getElementById('show-costs').addEventListener('change', (e) => {
      this.settings.showCosts = e.target.checked;
    });
    
    document.getElementById('currency-select').addEventListener('change', (e) => {
      this.settings.currency = e.target.value;
    });
    
    document.getElementById('cost-warnings').addEventListener('change', (e) => {
      this.settings.costWarnings = e.target.checked;
    });
    
    document.getElementById('cost-threshold').addEventListener('change', (e) => {
      this.settings.costThreshold = parseFloat(e.target.value);
    });
    
    document.getElementById('reset-pricing').addEventListener('click', () => {
      this.resetPricing();
    });

    // Notification settings
    document.getElementById('notifications-enabled').addEventListener('change', (e) => {
      this.settings.notifications = e.target.checked;
    });
    
    document.getElementById('context-warnings').addEventListener('change', (e) => {
      this.settings.contextWarnings = e.target.checked;
    });
    
    const contextThresholdSlider = document.getElementById('context-threshold');
    const contextThresholdValue = document.getElementById('context-threshold-value');
    
    contextThresholdSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      this.settings.contextThreshold = parseInt(value);
      contextThresholdValue.textContent = value + '%';
    });
    
    document.getElementById('session-summaries').addEventListener('change', (e) => {
      this.settings.sessionSummaries = e.target.checked;
    });

    // Data settings
    document.getElementById('auto-export').addEventListener('change', (e) => {
      this.settings.autoExport = e.target.checked;
    });
    
    document.getElementById('export-frequency').addEventListener('change', (e) => {
      this.settings.exportInterval = e.target.value;
    });
    
    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });
    
    document.getElementById('import-data').addEventListener('click', () => {
      this.importData();
    });
    
    document.getElementById('clear-history').addEventListener('click', () => {
      this.clearHistory();
    });
    
    document.getElementById('reset-all-data').addEventListener('click', () => {
      this.resetAllData();
    });

    // Advanced settings
    document.getElementById('update-interval').addEventListener('change', (e) => {
      this.settings.updateInterval = parseInt(e.target.value);
    });
    
    document.getElementById('debug-mode').addEventListener('change', (e) => {
      this.settings.debugMode = e.target.checked;
    });
    
    document.getElementById('performance-mode').addEventListener('change', (e) => {
      this.settings.performanceMode = e.target.checked;
    });
    
    document.getElementById('estimation-method').addEventListener('change', (e) => {
      this.settings.estimationMethod = e.target.value;
    });
    
    document.getElementById('custom-css').addEventListener('change', (e) => {
      this.settings.customCSS = e.target.value;
    });

    // File input for import
    document.getElementById('file-input').addEventListener('change', (e) => {
      this.handleFileImport(e.target.files[0]);
    });
  }

  switchSection(sectionName) {
    if (sectionName === this.currentSection) return;
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    
    // Hide current section
    const currentSection = document.getElementById(`${this.currentSection}-section`);
    if (currentSection) {
      currentSection.style.display = 'none';
    }
    
    // Show new section
    const newSection = document.getElementById(`${sectionName}-section`);
    if (newSection) {
      newSection.style.display = 'block';
    }
    
    this.currentSection = sectionName;
  }

  updateUI() {
    // Display settings
    document.getElementById('show-overlay').checked = this.settings.showOverlay;
    document.getElementById('theme-select').value = this.settings.theme;
    document.getElementById('overlay-x').value = this.settings.overlayPosition.x;
    document.getElementById('overlay-y').value = this.settings.overlayPosition.y;
    document.getElementById('show-live-counter').checked = this.settings.showLiveCounter;

    // Token counting settings
    document.getElementById('default-model').value = this.settings.defaultModel;
    document.getElementById('auto-detect-model').checked = this.settings.autoDetectModel;
    document.getElementById('include-system-tokens').checked = this.settings.includeSystemTokens;

    // Cost settings
    document.getElementById('show-costs').checked = this.settings.showCosts;
    document.getElementById('currency-select').value = this.settings.currency;
    document.getElementById('cost-warnings').checked = this.settings.costWarnings;
    document.getElementById('cost-threshold').value = this.settings.costThreshold;

    // Notification settings
    document.getElementById('notifications-enabled').checked = this.settings.notifications;
    document.getElementById('context-warnings').checked = this.settings.contextWarnings;
    document.getElementById('context-threshold').value = this.settings.contextThreshold;
    document.getElementById('context-threshold-value').textContent = this.settings.contextThreshold + '%';
    document.getElementById('session-summaries').checked = this.settings.sessionSummaries;

    // Data settings
    document.getElementById('auto-export').checked = this.settings.autoExport;
    document.getElementById('export-frequency').value = this.settings.exportInterval;

    // Advanced settings
    document.getElementById('update-interval').value = this.settings.updateInterval;
    document.getElementById('debug-mode').checked = this.settings.debugMode;
    document.getElementById('performance-mode').checked = this.settings.performanceMode;
    document.getElementById('estimation-method').value = this.settings.estimationMethod;
    document.getElementById('custom-css').value = this.settings.customCSS;
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        [this.STORAGE_KEYS.SETTINGS]: this.settings
      });
      
      this.showNotification('Settings saved successfully!', 'success');
      
      // Notify content scripts of settings change
      this.notifyContentScripts();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Error saving settings', 'error');
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to default?')) {
      return;
    }
    
    try {
      this.settings = { ...this.defaultSettings };
      await this.saveSettings();
      this.updateUI();
      this.applyTheme();
      
      this.showNotification('Settings reset to default', 'success');
      
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showNotification('Error resetting settings', 'error');
    }
  }

  applyTheme() {
    const body = document.body;
    
    if (this.settings.theme === 'dark') {
      body.classList.add('dark-theme');
    } else if (this.settings.theme === 'light') {
      body.classList.remove('dark-theme');
    } else {
      // Auto theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.toggle('dark-theme', prefersDark);
    }
  }

  async notifyContentScripts() {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && (tab.url.includes('chat.openai.com') || tab.url.includes('chatgpt.com'))) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'updateSettings',
            settings: this.settings
          }).catch(() => {
            // Content script might not be loaded
          });
        }
      }
    } catch (error) {
      console.error('Error notifying content scripts:', error);
    }
  }

  async updateStorageUsage() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'getStorageUsage' });
      if (result && result.success) {
        const { used, quota, percentage } = result.data;
        
        document.getElementById('storage-used').textContent = this.formatBytes(used);
        document.getElementById('storage-fill').style.width = `${Math.min(percentage, 100)}%`;
      }
    } catch (error) {
      console.error('Error getting storage usage:', error);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  setVersionInfo() {
    const manifest = chrome.runtime.getManifest();
    document.getElementById('version').textContent = manifest.version;
  }

  resetPricing() {
    // Reset custom pricing inputs
    ['gpt4o-input-price', 'gpt4o-output-price', 'gpt4-input-price', 'gpt4-output-price'].forEach(id => {
      document.getElementById(id).value = '';
    });
    
    this.showNotification('Pricing reset to default', 'success');
  }

  async exportData() {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'exportData' });
      if (result && result.success) {
        const data = result.data;
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const filename = `chatgpt-token-counter-data-${new Date().toISOString().split('T')[0]}.json`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showNotification('Error exporting data', 'error');
    }
  }

  importData() {
    document.getElementById('file-input').click();
  }

  async handleFileImport(file) {
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate data structure
      if (!this.validateImportData(data)) {
        this.showNotification('Invalid data format', 'error');
        return;
      }
      
      if (!confirm('This will replace your current data. Continue?')) {
        return;
      }
      
      // Import data
      if (data.conversations) {
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.CONVERSATIONS_HISTORY]: data.conversations
        });
      }
      
      if (data.dailyStats) {
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.DAILY_STATS]: data.dailyStats
        });
      }
      
      if (data.settings) {
        this.settings = { ...this.defaultSettings, ...data.settings };
        await this.saveSettings();
        this.updateUI();
        this.applyTheme();
      }
      
      this.showNotification('Data imported successfully', 'success');
      
    } catch (error) {
      console.error('Error importing data:', error);
      this.showNotification('Error importing data', 'error');
    }
  }

  validateImportData(data) {
    return data && typeof data === 'object' && 
           (data.conversations || data.dailyStats || data.settings);
  }

  async clearHistory() {
    if (!confirm('Are you sure you want to clear all conversation history?')) {
      return;
    }
    
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CONVERSATIONS_HISTORY]: []
      });
      
      this.showNotification('History cleared', 'success');
      this.updateStorageUsage();
      
    } catch (error) {
      console.error('Error clearing history:', error);
      this.showNotification('Error clearing history', 'error');
    }
  }

  async resetAllData() {
    if (!confirm('This will delete ALL data including settings, history, and statistics. Continue?')) {
      return;
    }
    
    if (!confirm('This action cannot be undone. Are you absolutely sure?')) {
      return;
    }
    
    try {
      // Clear all storage
      await chrome.storage.local.clear();
      await chrome.storage.sync.clear();
      
      // Reset settings
      this.settings = { ...this.defaultSettings };
      await this.saveSettings();
      this.updateUI();
      this.applyTheme();
      
      this.showNotification('All data reset', 'success');
      this.updateStorageUsage();
      
    } catch (error) {
      console.error('Error resetting data:', error);
      this.showNotification('Error resetting data', 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Simple notification - could be enhanced with a toast system
    if (type === 'success') {
      console.log('✅', message);
    } else if (type === 'error') {
      console.error('❌', message);
    } else {
      console.info('ℹ️', message);
    }
    
    // Could add a visual notification here
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : 'var(--primary-color)'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});

// Add slide-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);