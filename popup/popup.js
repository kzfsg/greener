/**
 * ChatGPT Token Counter Popup Script
 * Handles the popup interface functionality
 */

class TokenCounterPopup {
  constructor() {
    this.conversationData = null;
    this.statsData = null;
    this.currentTab = 'today';
    this.updateInterval = null;
    
    this.init();
  }

  async init() {
    console.log('Token Counter Popup: Initializing...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadData();
    
    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.loadData();
    }, 2000);
    
    // Update UI
    this.updateUI();
    
    // Apply theme
    this.applyTheme();
  }

  setupEventListeners() {
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.loadData();
    });
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportData();
    });
    
    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
      this.resetSession();
    });
    
    // Toggle overlay button
    document.getElementById('toggle-overlay-btn').addEventListener('click', () => {
      this.toggleOverlay();
    });
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  async loadData() {
    try {
      // Get current conversation data from content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (this.isChatGPTTab(currentTab)) {
        const response = await chrome.tabs.sendMessage(currentTab.id, { 
          type: 'getConversationData' 
        });
        
        if (response) {
          this.conversationData = response.conversation;
          this.isTracking = response.isTracking;
        }
      }
      
      // Load statistics data
      await this.loadStatsData();
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Unable to connect to ChatGPT tab');
    }
  }

  async loadStatsData() {
    try {
      // Load conversation history
      const historyResult = await chrome.storage.local.get('conversationsHistory');
      const conversations = historyResult.conversationsHistory || [];
      
      // Load daily stats
      const dailyStatsResult = await chrome.storage.local.get('dailyStats');
      const dailyStats = dailyStatsResult.dailyStats || {};
      
      this.statsData = {
        conversations,
        dailyStats,
        ...this.calculateStats(conversations)
      };
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  calculateStats(conversations) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    
    const todayConversations = conversations.filter(c => new Date(c.startTime) >= todayStart);
    const weekConversations = conversations.filter(c => new Date(c.startTime) >= weekStart);
    
    return {
      today: this.aggregateConversations(todayConversations),
      week: this.aggregateConversations(weekConversations),
      all: this.aggregateConversations(conversations)
    };
  }

  aggregateConversations(conversations) {
    return conversations.reduce((acc, conv) => {
      acc.count++;
      acc.totalTokens += (conv.totalInputTokens + conv.totalOutputTokens);
      acc.totalCost += conv.totalCost;
      acc.inputTokens += conv.totalInputTokens;
      acc.outputTokens += conv.totalOutputTokens;
      return acc;
    }, {
      count: 0,
      totalTokens: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0
    });
  }

  updateUI() {
    this.updateCurrentSession();
    this.updateStatistics();
    this.updateContextProgress();
    this.updateLastUpdated();
    this.updateStatusIndicator();
  }

  updateCurrentSession() {
    if (!this.conversationData) {
      this.showNoDataMessage();
      return;
    }

    const data = this.conversationData;
    
    // Update basic stats
    document.getElementById('input-tokens').textContent = data.totalInputTokens.toLocaleString();
    document.getElementById('output-tokens').textContent = data.totalOutputTokens.toLocaleString();
    document.getElementById('total-tokens').textContent = 
      (data.totalInputTokens + data.totalOutputTokens).toLocaleString();
    document.getElementById('estimated-cost').textContent = `$${data.totalCost.toFixed(4)}`;
    
    // Update model indicator
    document.getElementById('model-indicator').textContent = data.model.toUpperCase();
  }

  updateStatistics() {
    if (!this.statsData) return;
    
    const currentStats = this.statsData[this.currentTab];
    if (!currentStats) return;
    
    document.getElementById('conversations-count').textContent = currentStats.count.toLocaleString();
    document.getElementById('total-usage-tokens').textContent = currentStats.totalTokens.toLocaleString();
    document.getElementById('total-usage-cost').textContent = `$${currentStats.totalCost.toFixed(2)}`;
    
    const avgPerChat = currentStats.count > 0 ? 
      Math.round(currentStats.totalTokens / currentStats.count) : 0;
    document.getElementById('avg-per-chat').textContent = avgPerChat.toLocaleString();
  }

  updateContextProgress() {
    if (!this.conversationData) return;
    
    const data = this.conversationData;
    const maxTokens = this.getModelMaxTokens(data.model);
    const currentTokens = data.totalInputTokens + data.totalOutputTokens;
    const percentage = Math.min((currentTokens / maxTokens) * 100, 100);
    
    document.getElementById('context-current').textContent = currentTokens.toLocaleString();
    document.getElementById('context-max').textContent = maxTokens.toLocaleString();
    document.getElementById('context-percentage').textContent = `${percentage.toFixed(1)}%`;
    document.getElementById('context-progress').style.width = `${percentage}%`;
    
    // Show warning if approaching limit
    const warningElement = document.getElementById('context-warning');
    if (percentage > 80) {
      warningElement.style.display = 'block';
      warningElement.textContent = percentage > 95 ? 
        '🚨 Context limit nearly reached!' : 
        '⚠️ Approaching context limit';
    } else {
      warningElement.style.display = 'none';
    }
  }

  getModelMaxTokens(model) {
    const modelLimits = {
      'gpt-4o': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 4096
    };
    return modelLimits[model] || 128000;
  }

  updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-updated').textContent = timeString;
  }

  updateStatusIndicator() {
    const indicator = document.getElementById('status-indicator');
    
    if (this.isTracking) {
      indicator.className = 'status-indicator status-active';
      indicator.title = 'Connected to ChatGPT';
    } else {
      indicator.className = 'status-indicator status-error';
      indicator.title = 'Not connected to ChatGPT';
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update statistics
    this.updateStatistics();
  }

  showNoDataMessage() {
    const elements = ['input-tokens', 'output-tokens', 'total-tokens', 'estimated-cost'];
    elements.forEach(id => {
      document.getElementById(id).textContent = '--';
    });
  }

  showError(message) {
    console.error(message);
    // Could show a toast notification here
  }

  isChatGPTTab(tab) {
    return tab && (
      tab.url.includes('chat.openai.com') || 
      tab.url.includes('chatgpt.com')
    );
  }

  async resetSession() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (this.isChatGPTTab(currentTab)) {
        const response = await chrome.tabs.sendMessage(currentTab.id, { 
          type: 'resetConversation' 
        });
        
        if (response && response.success) {
          await this.loadData();
          this.updateUI();
          this.showSuccess('Session reset successfully');
        }
      }
    } catch (error) {
      console.error('Error resetting session:', error);
      this.showError('Failed to reset session');
    }
  }

  async toggleOverlay() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (this.isChatGPTTab(currentTab)) {
        await chrome.tabs.sendMessage(currentTab.id, { 
          type: 'toggleOverlay' 
        });
      }
    } catch (error) {
      console.error('Error toggling overlay:', error);
    }
  }

  async exportData() {
    try {
      const data = {
        currentConversation: this.conversationData,
        statistics: this.statsData,
        exportDate: new Date().toISOString()
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const filename = `chatgpt-token-usage-${new Date().toISOString().split('T')[0]}.json`;
      
      // Use Chrome's download API
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        if (downloadId) {
          this.showSuccess('Data exported successfully');
        }
        URL.revokeObjectURL(url);
      });
      
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data');
    }
  }

  applyTheme() {
    // Detect system theme and apply
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark-theme', prefersDark);
    
    // Listen for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.body.classList.toggle('dark-theme', e.matches);
    });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'conversationUpdate':
        this.conversationData = message.data;
        this.updateUI();
        break;
        
      case 'liveTokenUpdate':
        this.updateLiveCounter(message.data);
        break;
    }
  }

  updateLiveCounter(data) {
    const liveCounter = document.getElementById('live-counter');
    const liveChars = document.getElementById('live-chars');
    const liveTokens = document.getElementById('live-tokens');
    
    if (data.tokens > 0) {
      liveCounter.style.display = 'block';
      liveChars.textContent = data.characters;
      liveTokens.textContent = data.tokens;
    } else {
      liveCounter.style.display = 'none';
    }
  }

  showSuccess(message) {
    // Simple success feedback - could be enhanced with toast notifications
    console.log('Success:', message);
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TokenCounterPopup();
});

// Clean up on window unload
window.addEventListener('beforeunload', () => {
  if (window.tokenCounterPopup) {
    window.tokenCounterPopup.destroy();
  }
});