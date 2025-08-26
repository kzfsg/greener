/**
 * Simplified GPT Tokenizer for Chrome Extension
 * This is a basic implementation for token estimation
 * For production use, consider integrating the full gpt-tokenizer library
 */

class GPTTokenizer {
  constructor() {
    // Approximate token-to-character ratios for different models
    this.modelConfigs = {
      'gpt-4': { 
        avgCharsPerToken: 4, 
        maxTokens: 8192, 
        costPer1kInput: 0.03, 
        costPer1kOutput: 0.06 
      },
      'gpt-4o': { 
        avgCharsPerToken: 4, 
        maxTokens: 128000, 
        costPer1kInput: 0.005, 
        costPer1kOutput: 0.015 
      },
      'gpt-4-turbo': { 
        avgCharsPerToken: 4, 
        maxTokens: 128000, 
        costPer1kInput: 0.01, 
        costPer1kOutput: 0.03 
      },
      'gpt-3.5-turbo': { 
        avgCharsPerToken: 4, 
        maxTokens: 4096, 
        costPer1kInput: 0.0015, 
        costPer1kOutput: 0.002 
      }
    };
    
    this.defaultModel = 'gpt-4o';
  }

  /**
   * Estimate token count for a given text
   * @param {string} text - The text to tokenize
   * @param {string} model - The model to use for estimation
   * @returns {number} Estimated token count
   */
  encode(text, model = this.defaultModel) {
    if (!text || typeof text !== 'string') return 0;
    
    const config = this.modelConfigs[model] || this.modelConfigs[this.defaultModel];
    
    // Basic token estimation algorithm
    // Remove extra whitespace and normalize
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    
    // Count words and special characters
    const words = normalizedText.split(/\s+/).filter(word => word.length > 0);
    const specialChars = (normalizedText.match(/[^\w\s]/g) || []).length;
    
    // Estimate tokens based on:
    // - Average characters per token
    // - Word boundaries
    // - Special characters
    const charBasedEstimate = Math.ceil(normalizedText.length / config.avgCharsPerToken);
    const wordBasedEstimate = Math.ceil(words.length * 1.3); // Words often split into multiple tokens
    const specialCharTokens = Math.ceil(specialChars * 0.5); // Special chars may be separate tokens
    
    // Use the higher estimate for safety
    return Math.max(charBasedEstimate, wordBasedEstimate + specialCharTokens);
  }

  /**
   * Encode a chat conversation with proper formatting
   * @param {Array} messages - Array of message objects {role, content}
   * @param {string} model - The model to use for estimation
   * @returns {number} Estimated token count
   */
  encodeChat(messages, model = this.defaultModel) {
    if (!Array.isArray(messages)) return 0;
    
    let totalTokens = 0;
    
    // Add tokens for chat formatting overhead
    totalTokens += 4; // Chat format overhead
    
    for (const message of messages) {
      if (!message || typeof message !== 'object') continue;
      
      // Add tokens for message structure
      totalTokens += 4; // Role and message structure tokens
      
      // Add tokens for role
      if (message.role) {
        totalTokens += this.encode(message.role, model);
      }
      
      // Add tokens for content
      if (message.content) {
        totalTokens += this.encode(message.content, model);
      }
      
      // Add tokens for name if present
      if (message.name) {
        totalTokens += this.encode(message.name, model) + 1;
      }
    }
    
    // Add tokens for completion priming
    totalTokens += 2;
    
    return totalTokens;
  }

  /**
   * Get model configuration
   * @param {string} model - Model name
   * @returns {Object} Model configuration
   */
  getModelConfig(model = this.defaultModel) {
    return this.modelConfigs[model] || this.modelConfigs[this.defaultModel];
  }

  /**
   * Calculate cost for given tokens
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @param {string} model - Model name
   * @returns {number} Cost in USD
   */
  calculateCost(inputTokens, outputTokens, model = this.defaultModel) {
    const config = this.getModelConfig(model);
    const inputCost = (inputTokens / 1000) * config.costPer1kInput;
    const outputCost = (outputTokens / 1000) * config.costPer1kOutput;
    return inputCost + outputCost;
  }

  /**
   * Detect model from ChatGPT interface
   * @param {string} text - Text that might contain model information
   * @returns {string} Detected model name
   */
  detectModel(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('gpt-4o')) return 'gpt-4o';
    if (lowerText.includes('gpt-4-turbo') || lowerText.includes('gpt-4 turbo')) return 'gpt-4-turbo';
    if (lowerText.includes('gpt-4')) return 'gpt-4';
    if (lowerText.includes('gpt-3.5') || lowerText.includes('gpt-3.5-turbo')) return 'gpt-3.5-turbo';
    
    return this.defaultModel;
  }
}

// Make available globally for content script
window.GPTTokenizer = GPTTokenizer;

// Also export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GPTTokenizer;
}