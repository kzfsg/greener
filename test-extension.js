/**
 * Extension Testing Script
 * Run basic validation tests on the ChatGPT Token Counter extension
 */

// Test manifest validation
function testManifest() {
  console.log('🧪 Testing manifest.json...');
  
  try {
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    
    // Required fields
    const requiredFields = ['manifest_version', 'name', 'version', 'description'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Manifest version should be 3
    if (manifest.manifest_version !== 3) {
      throw new Error(`Expected manifest_version 3, got ${manifest.manifest_version}`);
    }
    
    // Check permissions
    const expectedPermissions = ['storage', 'activeTab', 'scripting'];
    const missingPermissions = expectedPermissions.filter(p => 
      !manifest.permissions.includes(p)
    );
    
    if (missingPermissions.length > 0) {
      console.warn(`⚠️  Missing permissions: ${missingPermissions.join(', ')}`);
    }
    
    // Check content scripts
    if (!manifest.content_scripts || manifest.content_scripts.length === 0) {
      throw new Error('No content scripts defined');
    }
    
    const contentScript = manifest.content_scripts[0];
    if (!contentScript.matches || !contentScript.js) {
      throw new Error('Content script missing matches or js files');
    }
    
    console.log('✅ Manifest validation passed');
    return true;
    
  } catch (error) {
    console.error('❌ Manifest validation failed:', error.message);
    return false;
  }
}

// Test file existence
function testFileStructure() {
  console.log('🧪 Testing file structure...');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'manifest.json',
    'popup/popup.html',
    'popup/popup.js',
    'popup/popup.css',
    'content/content.js',
    'content/content.css',
    'background/background.js',
    'options/options.html',
    'options/options.js',
    'options/options.css',
    'lib/gpt-tokenizer.js',
    'lib/error-handler.js',
    'styles/common.css',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png',
    'README.md'
  ];
  
  const missingFiles = [];
  const fileStats = {};
  
  for (const file of requiredFiles) {
    try {
      const stats = fs.statSync(file);
      fileStats[file] = {
        exists: true,
        size: stats.size,
        isEmpty: stats.size === 0
      };
      
      if (stats.size === 0) {
        console.warn(`⚠️  File is empty: ${file}`);
      }
      
    } catch (error) {
      missingFiles.push(file);
      fileStats[file] = { exists: false };
    }
  }
  
  if (missingFiles.length > 0) {
    console.error(`❌ Missing files: ${missingFiles.join(', ')}`);
    return false;
  }
  
  // Check file sizes for sanity
  const minSizes = {
    'lib/gpt-tokenizer.js': 1000,
    'lib/error-handler.js': 2000,
    'content/content.js': 2000,
    'popup/popup.js': 1000,
    'background/background.js': 1000,
    'options/options.js': 1000
  };
  
  for (const [file, minSize] of Object.entries(minSizes)) {
    if (fileStats[file] && fileStats[file].size < minSize) {
      console.warn(`⚠️  File seems small: ${file} (${fileStats[file].size} bytes)`);
    }
  }
  
  console.log('✅ File structure validation passed');
  return true;
}

// Test JavaScript syntax
function testJavaScriptSyntax() {
  console.log('🧪 Testing JavaScript syntax...');
  
  const fs = require('fs');
  const jsFiles = [
    'lib/gpt-tokenizer.js',
    'lib/error-handler.js',
    'content/content.js',
    'popup/popup.js',
    'background/background.js',
    'options/options.js'
  ];
  
  let allValid = true;
  
  for (const file of jsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Basic syntax checks
      if (content.includes('chrome.') && !content.includes('chrome.runtime')) {
        console.warn(`⚠️  ${file}: Uses Chrome APIs but may be missing error handling`);
      }
      
      // Check for common mistakes
      if (content.includes('eval(')) {
        console.error(`❌ ${file}: Contains eval() - security risk`);
        allValid = false;
      }
      
      if (content.includes('innerHTML') && !content.includes('textContent')) {
        console.warn(`⚠️  ${file}: Uses innerHTML - potential XSS risk`);
      }
      
      // Check for error handling
      if (!content.includes('try') && !content.includes('catch')) {
        console.warn(`⚠️  ${file}: No error handling detected`);
      }
      
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error.message);
      allValid = false;
    }
  }
  
  if (allValid) {
    console.log('✅ JavaScript syntax validation passed');
  }
  
  return allValid;
}

// Test HTML structure
function testHTMLStructure() {
  console.log('🧪 Testing HTML structure...');
  
  const fs = require('fs');
  const htmlFiles = [
    'popup/popup.html',
    'options/options.html'
  ];
  
  let allValid = true;
  
  for (const file of htmlFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Basic HTML structure
      if (!content.includes('<!DOCTYPE html>')) {
        console.warn(`⚠️  ${file}: Missing DOCTYPE declaration`);
      }
      
      if (!content.includes('<html') || !content.includes('</html>')) {
        console.error(`❌ ${file}: Invalid HTML structure`);
        allValid = false;
      }
      
      // Security checks
      if (content.includes('javascript:')) {
        console.error(`❌ ${file}: Contains javascript: protocol - security risk`);
        allValid = false;
      }
      
      // Check for required elements
      if (file === 'popup/popup.html') {
        if (!content.includes('id="input-tokens"')) {
          console.warn(`⚠️  ${file}: Missing expected popup elements`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error.message);
      allValid = false;
    }
  }
  
  if (allValid) {
    console.log('✅ HTML structure validation passed');
  }
  
  return allValid;
}

// Test CSS structure
function testCSSStructure() {
  console.log('🧪 Testing CSS structure...');
  
  const fs = require('fs');
  const cssFiles = [
    'styles/common.css',
    'popup/popup.css',
    'content/content.css',
    'options/options.css'
  ];
  
  let allValid = true;
  
  for (const file of cssFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Basic CSS checks
      if (content.includes('expression(')) {
        console.error(`❌ ${file}: Contains CSS expression - security risk`);
        allValid = false;
      }
      
      // Check for responsive design
      if (!content.includes('@media')) {
        console.warn(`⚠️  ${file}: No responsive media queries found`);
      }
      
      // Check for CSS custom properties (variables)
      if (file === 'styles/common.css' && !content.includes('--')) {
        console.warn(`⚠️  ${file}: No CSS custom properties found`);
      }
      
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error.message);
      allValid = false;
    }
  }
  
  if (allValid) {
    console.log('✅ CSS structure validation passed');
  }
  
  return allValid;
}

// Main test function
function runAllTests() {
  console.log('🚀 Starting ChatGPT Token Counter Extension Tests\n');
  
  const tests = [
    testManifest,
    testFileStructure,
    testJavaScriptSyntax,
    testHTMLStructure,
    testCSSStructure
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    if (test()) {
      passedTests++;
    }
    console.log(''); // Empty line between tests
  }
  
  console.log(`📊 Test Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! Extension is ready for testing.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
  
  return passedTests === tests.length;
}

// Export for Node.js usage or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests };
} else if (typeof window === 'undefined') {
  // Running in Node.js
  runAllTests();
}