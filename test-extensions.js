#!/usr/bin/env node
/**
 * Test harness for Mangayomi JavaScript extensions
 * Mirrors the actual QuickJS runtime environment in Mangayomi
 * Based on: https://github.com/kodjodevf/mangayomi/blob/main/lib/eval/javascript/service.dart
 */

const fs = require('fs');
const path = require('path');

// Mock Mangayomi runtime classes (available in QuickJS via Dart bridge)
class SharedPreferences {
  constructor() {
    this.prefs = {
      'mangafire_pref_content_view': 'chapter',
    };
  }
  get(key) {
    return this.prefs[key] || 'chapter';
  }
  set(key, value) {
    this.prefs[key] = value;
  }
}

class Client {
  async get(url, options = {}) {
    // Mock HTTP client - in real Mangayomi this calls native Dart HTTP client
    throw new Error(`HTTP GET not available in test harness: ${url}`);
  }
  async post(url, options = {}) {
    throw new Error(`HTTP POST not available in test harness: ${url}`);
  }
}

class Document {
  constructor(html) {
    // Mock jsoup-style DOM selector - in real Mangayomi this is JsDomSelector
    throw new Error('Document parsing not available in test harness');
  }
}

class MProvider {
  constructor() {
    // Base class provided by Mangayomi runtime
  }
}

// NOT AVAILABLE: CryptoJS is NOT in Mangayomi's runtime
// Extensions that try to use CryptoJS.MD5(), CryptoJS.SHA256() etc. will fail
// Only Mangayomi's bridge functions are available:
// - encryptAESCryptoJS(plainText, passphrase) - via sendMessage
// - decryptAESCryptoJS(encrypted, passphrase) - via sendMessage
// - decryptAESGCM(...) - via sendMessage

// Console is available (save original)
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

// Test an extension
function testExtension(extensionPath) {
  console.log(`\n=== Testing ${path.basename(extensionPath)} ===\n`);

  let extensionCode;
  try {
    extensionCode = fs.readFileSync(extensionPath, 'utf8');
  } catch (error) {
    console.error(`❌ Failed to read extension: ${error.message}`);
    return { passed: false, errors: [error.message] };
  }

  const errors = [];
  const warnings = [];

  // Check for forbidden dependencies
  if (extensionCode.includes('CryptoJS.')) {
    errors.push('Uses CryptoJS which is NOT available in Mangayomi runtime');
    errors.push('  → Use Mangayomi bridge functions: encryptAESCryptoJS, decryptAESCryptoJS');
  }

  if (extensionCode.includes('require(') || extensionCode.includes('import ')) {
    errors.push('Uses require/import which are not available in QuickJS');
  }

  // Try to evaluate the extension
  let mangayomiSources, DefaultExtension;
  try {
    const context = {
      mangayomiSources: null,
      DefaultExtension: null,
      MProvider,
      SharedPreferences,
      Client,
      Document,
    };

    eval(`(function() {
      ${extensionCode}
      this.mangayomiSources = mangayomiSources;
      this.DefaultExtension = DefaultExtension;
    }).call(context)`);

    mangayomiSources = context.mangayomiSources;
    DefaultExtension = context.DefaultExtension;
  } catch (error) {
    errors.push(`Failed to evaluate extension: ${error.message}`);
    return { passed: false, errors };
  }

  // Validate mangayomiSources
  if (!Array.isArray(mangayomiSources) || mangayomiSources.length === 0) {
    errors.push('mangayomiSources must be a non-empty array');
    return { passed: false, errors };
  }

  const source = mangayomiSources[0];
  const requiredFields = ['id', 'name', 'baseUrl', 'version'];
  for (const field of requiredFields) {
    if (!(field in source)) {
      errors.push(`mangayomiSources[0] missing required field: ${field}`);
    }
  }
  
  // Either 'langs' (multi-language) or single entry is fine
  if (!source.langs && mangayomiSources.length === 1) {
    warnings.push('Single-language extension without langs array');
  }

  // Check version format
  if (source.version && !/^\d+\.\d+\.\d+$/.test(source.version)) {
    warnings.push(`Version ${source.version} should follow semver format (x.y.z)`);
  }

  // Try to instantiate extension
  try {
    const extension = new DefaultExtension();
    console.log('✓ Extension instantiated successfully');
  } catch (error) {
    errors.push(`Failed to instantiate extension: ${error.message}`);
  }

  // Check required methods
  const requiredMethods = ['getPopular', 'getLatestUpdates', 'search', 'getDetail', 'getPageList'];
  const proto = DefaultExtension.prototype;
  for (const method of requiredMethods) {
    if (typeof proto[method] !== 'function') {
      errors.push(`Missing required method: ${method}`);
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error('❌ FAILED\n');
    errors.forEach(error => console.error(`  ${error}`));
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  WARNINGS\n');
    warnings.forEach(warning => console.warn(`  ${warning}`));
  }

  if (errors.length === 0) {
    console.log('✅ PASSED\n');
    console.log(`  Name: ${source.name}`);
    console.log(`  ID: ${source.id}`);
    console.log(`  Version: ${source.version}`);
    console.log(`  Languages: ${source.langs ? source.langs.join(', ') : 'N/A'}`);
    console.log(`  Base URL: ${source.baseUrl}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    source,
  };
}

// Run tests
function main() {
  console.log('Testing Mangayomi Extensions');
  console.log('============================');

  const extensions = [
    './javascript/manga/src/en/asurascans.js',
    './javascript/manga/src/all/mangafire.js',
    './javascript/manga/src/en/weebcentral.js',
  ];

  let allPassed = true;
  const results = [];

  for (const ext of extensions) {
    const result = testExtension(ext);
    results.push({ path: ext, ...result });
    if (!result.passed) {
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Summary');
  console.log('='.repeat(50) + '\n');

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${path.basename(result.path)}`);
  });

  console.log(`\n${results.filter(r => r.passed).length}/${results.length} extensions passed\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testExtension };
