# ChatGPT Token Counter Chrome Extension

A comprehensive Chrome extension that tracks and displays token usage for ChatGPT conversations in real-time with accurate token counting and cost estimation.

## Features

### Core Functionality
- **Real-time Token Counting**: Track tokens as you type and receive responses
- **Accurate Token Estimation**: Uses advanced tokenization algorithms for GPT models
- **Cost Calculation**: Estimate API costs based on current OpenAI pricing
- **Multi-Model Support**: GPT-4o, GPT-4 Turbo, GPT-4, and GPT-3.5 Turbo
- **Session Persistence**: Data persists across page reloads and browser restarts

### User Interface
- **Floating Overlay**: Unobtrusive token counter on ChatGPT interface
- **Popup Dashboard**: Comprehensive statistics and controls
- **Options Page**: Extensive customization settings
- **Dark Mode**: Automatic theme detection and manual override
- **Responsive Design**: Works on various screen sizes

### Advanced Features
- **Context Limit Warnings**: Alerts when approaching model limits
- **Usage Statistics**: Daily, weekly, and all-time analytics
- **Data Export**: Export conversation data and statistics
- **Memory Management**: Automatic cleanup to prevent memory leaks
- **Error Handling**: Robust error recovery and user feedback

## Installation

### Chrome Web Store (Coming Soon)
The extension will be available on the Chrome Web Store.

### Manual Installation (Development)
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

### Requirements
- Chrome 88+ or Edge 88+ (Manifest V3 support)
- Access to ChatGPT (chat.openai.com or chatgpt.com)

## Usage

### Getting Started
1. Install the extension
2. Navigate to ChatGPT (chat.openai.com)
3. The floating overlay will appear automatically
4. Start a conversation to begin tracking tokens

### Floating Overlay
- **Position**: Drag to reposition anywhere on the page
- **Toggle**: Click the minimize button to collapse/expand
- **Live Updates**: Shows real-time token counts and costs

### Popup Interface
Click the extension icon to access:
- **Current Session**: Input/output tokens, total cost, model detected
- **Live Counter**: Tokens counted as you type
- **Usage Statistics**: Historical data with time period filters
- **Context Progress**: Visual indicator of context window usage
- **Quick Actions**: Reset session, toggle overlay, export data

### Settings & Customization
Access the full settings page via the popup or right-click → Options:

#### Display Preferences
- Show/hide floating overlay
- Theme selection (Auto, Light, Dark)
- Overlay position and styling
- Live counter toggle

#### Token Counting
- Default model selection
- Auto-detection settings
- System token inclusion
- Estimation method (Balanced, Conservative, Aggressive)

#### Costs & Pricing
- Currency selection (USD, EUR, GBP, JPY)
- Cost warning thresholds
- Custom pricing for different models
- Daily spending limits

#### Notifications
- Context limit warnings (configurable threshold)
- Cost threshold alerts
- Session end summaries

#### Data Management
- Automatic data export (daily/weekly/monthly)
- Manual export in JSON format
- Storage usage monitoring
- Clear history and reset options

#### Advanced Settings
- Update interval configuration
- Debug logging
- Performance mode
- Custom CSS for overlay styling

## Privacy & Security

### Data Storage
- **Local Only**: All data is stored locally on your device
- **No External Servers**: No data is sent to external services
- **No Content Storage**: Only token counts are stored, not conversation content
- **User Control**: Full control over data export and deletion

### Permissions
The extension requires minimal permissions:
- `storage`: Save settings and statistics locally
- `activeTab`: Access ChatGPT pages only when active
- `scripting`: Inject content scripts for token counting

## Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension format
- **Content Script**: Monitors ChatGPT interface
- **Background Service Worker**: Handles data persistence and cross-tab communication
- **Popup Interface**: Real-time statistics and controls
- **Options Page**: Comprehensive settings management

### Token Counting Algorithm
The extension uses a sophisticated token estimation algorithm that considers:
- Character count and word boundaries
- Special characters and formatting
- Chat message structure and roles
- Model-specific tokenization patterns

### Model Support
- **GPT-4o**: 128K context, latest pricing
- **GPT-4 Turbo**: 128K context, optimized costs
- **GPT-4**: 8K context, high accuracy
- **GPT-3.5 Turbo**: 4K context, cost-effective

### Performance Optimizations
- **Rate Limiting**: Prevents excessive API calls
- **Debouncing**: Optimizes real-time updates
- **Memory Management**: Automatic cleanup of old data
- **Lazy Loading**: Components load as needed

## Troubleshooting

### Common Issues

#### Extension Not Working
1. Ensure you're on chat.openai.com or chatgpt.com
2. Refresh the page after installing
3. Check if the extension is enabled in chrome://extensions/
4. Try disabling other extensions that might conflict

#### Token Counts Seem Incorrect
1. Check the selected model in settings
2. Verify auto-detection is working properly
3. Try switching estimation methods in advanced settings
4. Compare with OpenAI's official token counter

#### Overlay Not Appearing
1. Check if overlay is enabled in settings
2. Try resetting overlay position
3. Look for the overlay at screen edges (it might be off-screen)
4. Refresh the page and wait a few seconds

#### High Memory Usage
1. Enable performance mode in advanced settings
2. Clear conversation history periodically
3. Reduce update interval
4. Check for browser memory issues

### Error Reporting
The extension includes comprehensive error logging:
1. Enable debug mode in advanced settings
2. Check browser console for detailed error messages
3. Export error logs via the data management section

## Development

### Setup
```bash
git clone <repository-url>
cd chatgpt-token-counter
# No build process required - pure HTML/CSS/JS
```

### File Structure
```
/
├── manifest.json                 # Extension manifest
├── popup/                       # Popup interface
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/                     # Content scripts
│   ├── content.js
│   └── content.css
├── background/                  # Service worker
│   └── background.js
├── options/                     # Settings page
│   ├── options.html
│   ├── options.js
│   └── options.css
├── lib/                        # Libraries
│   ├── gpt-tokenizer.js
│   └── error-handler.js
├── icons/                      # Extension icons
├── styles/                     # Shared styles
│   └── common.css
└── README.md
```

### Testing
1. Load extension in development mode
2. Navigate to ChatGPT
3. Test all major features:
   - Token counting accuracy
   - Overlay functionality
   - Settings persistence
   - Error handling
   - Memory usage

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Version History

### v1.0.0 (Initial Release)
- Real-time token counting
- Floating overlay interface
- Comprehensive popup dashboard
- Full settings page
- Multi-model support
- Data export functionality
- Error handling and recovery
- Dark mode support
- Performance optimizations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, bug reports, or feature requests:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the settings for configuration options

## Acknowledgments

- OpenAI for ChatGPT and tokenization standards
- Chrome Extension community for best practices
- Contributors and beta testers

---

**Note**: This extension is not affiliated with OpenAI. It's an independent tool created to help users track their token usage and costs when using ChatGPT.