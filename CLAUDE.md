# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Manifest V3 Chrome extension that tracks ChatGPT token usage in real-time. The extension provides a floating overlay on ChatGPT pages, a popup dashboard, comprehensive settings, and data persistence.

## Development Commands

### Testing and Validation
```bash
# Validate extension structure and syntax
node test-extension.js

# Validate manifest.json syntax
python3 -c "import json; print('✅ Valid' if json.load(open('manifest.json')) else '❌ Invalid')"

# Load extension for testing
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select this directory
```

### File Operations
```bash
# Find all extension files
find . -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" | sort

# Check icon files exist
ls -la icons/
```

## Architecture Overview

### Core Components Architecture

The extension follows a multi-component architecture with clear separation of concerns:

1. **Content Script System** (`content/content.js`):
   - `ChatGPTTokenTracker` class monitors ChatGPT's DOM
   - Uses `MutationObserver` to detect new messages
   - Implements retry logic with progressive backoff for ChatGPT UI changes
   - Creates floating overlay with drag-and-drop positioning

2. **Background Service Worker** (`background/background.js`):
   - `TokenCounterBackground` handles cross-tab communication
   - Manages periodic data cleanup and storage quotas
   - Implements daily/weekly statistics aggregation
   - Provides notification system for cost/context warnings

3. **Library System** (`lib/`):
   - `GPTTokenizer` - Custom tokenization algorithm for GPT models
   - `ErrorHandler` - Comprehensive error recovery and logging system
   - `PerformanceManager` - Memory management and optimization

4. **UI Components**:
   - Popup (`popup/`) - Real-time dashboard with statistics tabs
   - Options (`options/`) - Settings page with 6 sections and navigation
   - Overlay (in content script) - Floating widget with live token counts

### Data Flow Architecture

1. **Token Calculation Flow**:
   ```
   User Input → Content Script → GPTTokenizer → Rate Limited Processing → Storage + UI Update
   ```

2. **Message Processing Flow**:
   ```
   DOM Changes → MutationObserver → Message Extraction → Token Counting → Conversation Update
   ```

3. **Storage Architecture**:
   - `chrome.storage.sync` - User settings and preferences
   - `chrome.storage.local` - Conversation data and statistics
   - Background worker manages cleanup and aggregation

### Error Handling Architecture

The extension implements a three-tier error handling system:

1. **Global Error Capture** - `ErrorHandler` catches unhandled errors and promise rejections
2. **Retry Logic** - Exponential backoff for DOM queries and storage operations
3. **Graceful Degradation** - Fallback behaviors when ChatGPT UI changes are detected

### Performance Optimization System

- **Rate Limiting** - Prevents excessive token calculations during rapid typing
- **Debouncing** - Optimizes real-time UI updates
- **Memory Management** - Automatic cleanup of old conversation data
- **Caching** - DOM query results and token calculations are cached
- **Batch Processing** - Multiple messages processed together for efficiency

## Key Technical Patterns

### DOM Interaction Pattern
The extension uses a multi-selector fallback pattern for DOM queries to handle ChatGPT UI changes:

```javascript
const selectors = [
  'textarea[placeholder*="Message"]',  // Primary selector
  'textarea[data-id]',                // Fallback 1
  '[contenteditable="true"]',         // Fallback 2
  'textarea'                          // Final fallback
];
```

### Storage Operation Pattern
All storage operations use the `ErrorHandler.safeStorageOperation()` wrapper with retry logic:

```javascript
await this.errorHandler.safeStorageOperation('get', 'local', key);
```

### Event Handler Pattern
UI components use debounced/rate-limited event handlers to prevent performance issues:

```javascript
this.debouncedUpdateLiveTokenCount = this.errorHandler.debounce(
  this.updateLiveTokenCount.bind(this), 300
);
```

## Critical Integration Points

1. **Content Script Injection Order**: `error-handler.js` must load before `gpt-tokenizer.js` and `content.js`

2. **Chrome API Validation**: All components validate Chrome extension APIs are available before use

3. **Cross-Component Communication**: 
   - Content script ↔ Popup: `chrome.runtime.sendMessage`
   - Background ↔ All: Message passing with error handling
   - Storage synchronization across all components

4. **ChatGPT DOM Dependencies**:
   - Message containers: `[data-testid="conversation-turn"]`, `.text-base`
   - Input areas: `textarea[placeholder*="Message"]`, `[contenteditable="true"]`
   - The extension includes fallback selectors for UI resilience

## Extension-Specific Considerations

- **Manifest V3 Compliance**: Uses service workers, not background pages
- **Host Permissions**: Limited to `chat.openai.com` and `chatgpt.com` domains
- **Security**: No external network requests, all processing is local
- **Storage Limits**: Implements automatic cleanup to stay within Chrome's storage quotas
- **Performance**: Uses `requestIdleCallback` for non-critical operations when available

## Development Workflow

1. **Making Changes**: Modify files → Reload extension in `chrome://extensions/` → Test on ChatGPT
2. **Adding Features**: Update manifest permissions if needed → Implement in appropriate component → Update settings page if user-configurable
3. **Debugging**: Enable debug mode in settings → Check browser console → Review error logs in extension

## Testing Strategy

The extension includes comprehensive validation via `test-extension.js` which checks:
- Manifest structure and permissions
- File existence and non-empty content  
- JavaScript syntax and security patterns
- HTML structure and required elements
- CSS structure and responsive design

Run tests after any significant changes to ensure extension integrity.