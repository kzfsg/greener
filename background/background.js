/**
 * Background Service Worker for ChatGPT Token Counter
 * Handles data persistence, cross-tab communication, and extension lifecycle
 */

class TokenCounterBackground {
  constructor() {
    this.STORAGE_KEYS = {
      CURRENT_CONVERSATION: 'currentConversation',
      CONVERSATIONS_HISTORY: 'conversationsHistory',
      DAILY_STATS: 'dailyStats',
      SETTINGS: 'settings'
    };
    
    this.init();
  }

  init() {
    console.log('Token Counter Background: Service worker started');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize default settings
    this.initializeDefaultSettings();
    
    // Set up periodic cleanup
    this.scheduleCleanup();
  }

  setupEventListeners() {
    // Handle extension install/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });
    
    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
    
    // Handle tab updates to detect navigation to ChatGPT
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
    
    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, area) => {
      this.handleStorageChange(changes, area);
    });
    
    // Handle alarm events for periodic tasks
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
  }

  async initializeDefaultSettings() {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEYS.SETTINGS);
      
      if (!result[this.STORAGE_KEYS.SETTINGS]) {
        const defaultSettings = {
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
          costThreshold: 1.0
        };
        
        await chrome.storage.sync.set({
          [this.STORAGE_KEYS.SETTINGS]: defaultSettings
        });
        
        console.log('Default settings initialized');
      }
    } catch (error) {
      console.error('Error initializing default settings:', error);
    }
  }

  handleInstall(details) {
    console.log('Extension installed/updated:', details.reason);
    
    switch (details.reason) {
      case 'install':
        this.handleFirstInstall();
        break;
        
      case 'update':
        this.handleUpdate(details.previousVersion);
        break;
    }
  }

  async handleFirstInstall() {
    console.log('First time installation');
    
    // Show welcome notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'ChatGPT Token Counter',
        message: 'Extension installed! Open ChatGPT to start tracking tokens.'
      });
    }
    
    // Initialize empty data structures
    await chrome.storage.local.set({
      [this.STORAGE_KEYS.CONVERSATIONS_HISTORY]: [],
      [this.STORAGE_KEYS.DAILY_STATS]: {}
    });
  }

  async handleUpdate(previousVersion) {
    console.log('Extension updated from version:', previousVersion);
    
    // Perform migration if needed
    await this.performMigration(previousVersion);
    
    // Show update notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'ChatGPT Token Counter Updated',
        message: 'Extension has been updated with new features!'
      });
    }
  }

  async performMigration(previousVersion) {
    try {
      // Add migration logic here as needed
      console.log('Performing migration from version:', previousVersion);
      
      // Example: migrate old storage format to new format
      const oldData = await chrome.storage.local.get('tokenData');
      if (oldData.tokenData) {
        // Migrate old format to new format
        await chrome.storage.local.remove('tokenData');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'getStats':
          const stats = await this.getStatistics(message.period);
          sendResponse({ success: true, data: stats });
          break;
          
        case 'updateDailyStats':
          await this.updateDailyStats(message.data);
          sendResponse({ success: true });
          break;
          
        case 'exportData':
          const exportData = await this.exportAllData();
          sendResponse({ success: true, data: exportData });
          break;
          
        case 'cleanupOldData':
          await this.cleanupOldData();
          sendResponse({ success: true });
          break;
          
        case 'getStorageUsage':
          const usage = await this.getStorageUsage();
          sendResponse({ success: true, data: usage });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    // Return true to indicate async response
    return true;
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // Check if user navigated to ChatGPT
    if (changeInfo.status === 'complete' && tab.url) {
      if (this.isChatGPTUrl(tab.url)) {
        console.log('ChatGPT tab detected:', tabId);
        this.notifyTabReady(tabId);
      }
    }
  }

  isChatGPTUrl(url) {
    return url.includes('chat.openai.com') || url.includes('chatgpt.com');
  }

  async notifyTabReady(tabId) {
    // Small delay to ensure content script is ready
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'backgroundReady' });
      } catch (error) {
        // Content script might not be ready yet
        console.log('Content script not ready yet:', error.message);
      }
    }, 1000);
  }

  handleStorageChange(changes, area) {
    // Log important storage changes
    if (area === 'local') {
      if (changes[this.STORAGE_KEYS.CURRENT_CONVERSATION]) {
        console.log('Current conversation updated');
        this.updateDailyStatsFromConversation(changes[this.STORAGE_KEYS.CURRENT_CONVERSATION].newValue);
      }
    }
  }

  async updateDailyStatsFromConversation(conversation) {
    if (!conversation) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.DAILY_STATS);
      const dailyStats = result[this.STORAGE_KEYS.DAILY_STATS] || {};
      
      if (!dailyStats[today]) {
        dailyStats[today] = {
          conversations: 0,
          totalTokens: 0,
          totalCost: 0,
          inputTokens: 0,
          outputTokens: 0
        };
      }
      
      // Update today's stats
      const todayStats = dailyStats[today];
      todayStats.totalTokens = conversation.totalInputTokens + conversation.totalOutputTokens;
      todayStats.totalCost = conversation.totalCost;
      todayStats.inputTokens = conversation.totalInputTokens;
      todayStats.outputTokens = conversation.totalOutputTokens;
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.DAILY_STATS]: dailyStats
      });
      
      // Check for cost warnings
      await this.checkCostWarnings(todayStats);
      
    } catch (error) {
      console.error('Error updating daily stats:', error);
    }
  }

  async checkCostWarnings(todayStats) {
    try {
      const settings = await this.getSettings();
      
      if (settings.costWarnings && todayStats.totalCost > settings.costThreshold) {
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Cost Warning',
            message: `Today's usage cost ($${todayStats.totalCost.toFixed(2)}) has exceeded your threshold of $${settings.costThreshold.toFixed(2)}`
          });
        }
      }
    } catch (error) {
      console.error('Error checking cost warnings:', error);
    }
  }

  async getSettings() {
    const result = await chrome.storage.sync.get(this.STORAGE_KEYS.SETTINGS);
    return result[this.STORAGE_KEYS.SETTINGS] || {};
  }

  handleAlarm(alarm) {
    console.log('Alarm triggered:', alarm.name);
    
    switch (alarm.name) {
      case 'dailyCleanup':
        this.performDailyCleanup();
        break;
        
      case 'weeklyExport':
        this.performWeeklyExport();
        break;
    }
  }

  scheduleCleanup() {
    // Schedule daily cleanup at midnight
    chrome.alarms.create('dailyCleanup', {
      when: this.getNextMidnight(),
      periodInMinutes: 24 * 60 // Daily
    });
  }

  getNextMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
  }

  async performDailyCleanup() {
    console.log('Performing daily cleanup...');
    
    try {
      // Clean up old conversation history (keep last 30 days)
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.CONVERSATIONS_HISTORY);
      const conversations = result[this.STORAGE_KEYS.CONVERSATIONS_HISTORY] || [];
      
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredConversations = conversations.filter(conv => 
        conv.startTime > thirtyDaysAgo
      );
      
      if (filteredConversations.length !== conversations.length) {
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.CONVERSATIONS_HISTORY]: filteredConversations
        });
        console.log(`Cleaned up ${conversations.length - filteredConversations.length} old conversations`);
      }
      
      // Clean up old daily stats (keep last 90 days)
      const dailyStatsResult = await chrome.storage.local.get(this.STORAGE_KEYS.DAILY_STATS);
      const dailyStats = dailyStatsResult[this.STORAGE_KEYS.DAILY_STATS] || {};
      
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];
      
      const cleanedStats = {};
      Object.keys(dailyStats).forEach(date => {
        if (date >= cutoffDate) {
          cleanedStats[date] = dailyStats[date];
        }
      });
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.DAILY_STATS]: cleanedStats
      });
      
    } catch (error) {
      console.error('Error during daily cleanup:', error);
    }
  }

  async performWeeklyExport() {
    try {
      const settings = await this.getSettings();
      if (settings.autoExport && settings.exportInterval === 'weekly') {
        const data = await this.exportAllData();
        // Could implement automatic download or cloud storage here
        console.log('Weekly export prepared');
      }
    } catch (error) {
      console.error('Error during weekly export:', error);
    }
  }

  async getStatistics(period = 'all') {
    try {
      const result = await chrome.storage.local.get([
        this.STORAGE_KEYS.CONVERSATIONS_HISTORY,
        this.STORAGE_KEYS.DAILY_STATS
      ]);
      
      const conversations = result[this.STORAGE_KEYS.CONVERSATIONS_HISTORY] || [];
      const dailyStats = result[this.STORAGE_KEYS.DAILY_STATS] || {};
      
      // Calculate statistics based on period
      let filteredConversations = conversations;
      
      if (period === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        filteredConversations = conversations.filter(c => 
          new Date(c.startTime) >= todayStart
        );
      } else if (period === 'week') {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        filteredConversations = conversations.filter(c => 
          new Date(c.startTime) >= weekStart
        );
      }
      
      return {
        conversations: filteredConversations,
        dailyStats,
        summary: this.calculateSummary(filteredConversations)
      };
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      return null;
    }
  }

  calculateSummary(conversations) {
    return conversations.reduce((acc, conv) => {
      acc.totalConversations++;
      acc.totalTokens += (conv.totalInputTokens + conv.totalOutputTokens);
      acc.totalCost += conv.totalCost;
      acc.inputTokens += conv.totalInputTokens;
      acc.outputTokens += conv.totalOutputTokens;
      
      // Track model usage
      if (!acc.modelUsage[conv.model]) {
        acc.modelUsage[conv.model] = 0;
      }
      acc.modelUsage[conv.model]++;
      
      return acc;
    }, {
      totalConversations: 0,
      totalTokens: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      modelUsage: {}
    });
  }

  async exportAllData() {
    try {
      const [conversationsResult, dailyStatsResult, settingsResult] = await Promise.all([
        chrome.storage.local.get(this.STORAGE_KEYS.CONVERSATIONS_HISTORY),
        chrome.storage.local.get(this.STORAGE_KEYS.DAILY_STATS),
        chrome.storage.sync.get(this.STORAGE_KEYS.SETTINGS)
      ]);
      
      return {
        conversations: conversationsResult[this.STORAGE_KEYS.CONVERSATIONS_HISTORY] || [],
        dailyStats: dailyStatsResult[this.STORAGE_KEYS.DAILY_STATS] || {},
        settings: settingsResult[this.STORAGE_KEYS.SETTINGS] || {},
        exportTimestamp: new Date().toISOString(),
        version: chrome.runtime.getManifest().version
      };
      
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  async getStorageUsage() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      
      return {
        used: usage,
        quota,
        percentage: (usage / quota) * 100
      };
      
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, quota: 0, percentage: 0 };
    }
  }

  async cleanupOldData() {
    await this.performDailyCleanup();
  }
}

// Initialize background service
new TokenCounterBackground();