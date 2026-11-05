# Contributing to Mangayomi Extensions

Guide for adding new extensions to this repository.

## Prerequisites

- Node.js (for validation and testing)
- Understanding of Mangayomi's JavaScript extension format
- Target source website must be accessible

## Extension Requirements

### 1. Extension Structure

Every extension must define:

```javascript
const mangayomiSources = [{
  "id": <unique_integer>,           // Unique positive integer
  "name": "Source Name",
  "baseUrl": "https://example.com",
  "version": "0.1.0",               // Semver format
  "langs": ["en"],                  // Language codes (or omit for single-lang)
  "typeSource": "single",
  "itemType": 0,                    // 0=manga, 1=anime, 2=novel
  "iconUrl": "https://...",
  "dateFormat": "",
  "dateFormatLocale": "",
  "pkgPath": "manga/src/en/source.js"
}];

class DefaultExtension extends MProvider {
  async getPopular(page) { /* ... */ }
  async getLatestUpdates(page) { /* ... */ }
  async search(query, page, filters) { /* ... */ }
  async getDetail(url) { /* ... */ }
  async getPageList(url) { /* ... */ }
  getFilterList() { /* ... */ }
  getSourcePreferences() { /* ... */ }
}
```

### 2. Available Runtime APIs

**✅ Available in Mangayomi:**
- `Client()` - HTTP client (`.get(url, {headers})`, `.post(...)`)
- `Document(html)` - jsoup-style DOM selector
- `SharedPreferences()` - persistent storage (`.get(key)`, `.set(key, value)`)
- `MProvider` - base class
- Standard JavaScript (ES6, no modules)
- Console (`console.log`, `console.warn`, `console.error`)

**❌ NOT available:**
- `CryptoJS` - use Mangayomi bridge functions instead:
  - `encryptAESCryptoJS(plainText, passphrase)` via `sendMessage`
  - `decryptAESCryptoJS(encrypted, passphrase)` via `sendMessage`
- `require()` / `import` - no module system
- Node.js APIs (`fs`, `path`, etc.)
- External libraries

### 3. index.json Entry

Add entry to `index.json`:

```json
{
  "name": "Source Name",
  "id": 123456789,
  "baseUrl": "https://example.com",
  "lang": "en",
  "typeSource": "single",
  "iconUrl": "https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/javascript/icon/en.source.png",
  "dateFormat": "",
  "dateFormatLocale": "",
  "isNsfw": false,
  "hasCloudflare": false,
  "sourceCodeUrl": "https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/javascript/manga/src/en/source.js",
  "apiUrl": "",
  "version": "0.1.0",
  "isManga": true,
  "itemType": 0,
  "isFullData": false,
  "appMinVerReq": "0.5.0",
  "additionalParams": "",
  "sourceCodeLanguage": 1,
  "notes": ""
}
```

**Required fields:**
- `id` (number) - Unique positive integer
- `name` (string)
- `baseUrl` (string)
- `lang` (string) - 2-letter ISO code (`"en"`, `"ja"`, etc.)
- `version` (string) - Semver format
- `sourceCodeUrl` (string)
- `typeSource` (string)
- `iconUrl` (string)
- `isManga` (boolean)
- `itemType` (number) - 0=manga, 1=anime, 2=novel
- `isFullData` (boolean)
- `appMinVerReq` (string)
- `sourceCodeLanguage` (number) - 1=JavaScript
- `hasCloudflare` (boolean)
- `isNsfw` (boolean)

**All string fields must be non-null** (use `""` for empty).

### 4. Multi-Language Support

For sources that support multiple languages:

1. **Option A**: Multiple index.json entries (recommended by Mangayomi)
   ```json
   [
     {"id": 123456789, "lang": "en", "name": "Source", ...},
     {"id": 987654321, "lang": "ja", "name": "Source", ...}
   ]
   ```
   - Each language has unique ID
   - Same `sourceCodeUrl`
   - Mangayomi passes selected `lang` via `this.source.lang`

2. **Option B**: Single entry with runtime language selection
   ```javascript
   const mangayomiSources = [{
     "id": 123456789,
     "langs": ["en", "ja", "fr"],  // Available languages
     // Extension uses this.source.lang at runtime
   }];
   ```

### 5. Icon Requirements

- Format: PNG
- Size: 96x96px or larger
- Location: `javascript/icon/[lang.]source.png`
- Examples:
  - `javascript/icon/en.asurascans.png`
  - `javascript/icon/mangafire.png` (for all/ sources)

## Validation & Testing

### 1. Validate index.json

```bash
node validate-index.js
```

Checks:
- All required fields present
- Correct field types
- No duplicate IDs
- No null values where strings expected

### 2. Test Extension

```bash
node test-extensions.js
```

Checks:
- Extension loads without errors
- No forbidden dependencies (CryptoJS)
- Required methods implemented
- mangayomiSources structure valid

### 3. Manual Testing in Mangayomi

1. Commit changes and push to GitHub
2. Add/update repository in Mangayomi
3. Test:
   - Browse popular titles
   - Search
   - Load manga details
   - Load chapter list
   - Load and view pages

## Handling Cloudflare

Some sources use Cloudflare protection. **Do not attempt to bypass it manually**.

- Mangayomi handles Cloudflare JS challenges automatically
- Mark `hasCloudflare: true` in index.json
- Test in actual Mangayomi app, not Node.js

## Versioning

Follow semantic versioning:
- **0.1.0** - Initial release
- **0.1.x** - Bug fixes, small improvements
- **0.x.0** - New features, significant changes
- **x.0.0** - Breaking changes

**Important**: Mangayomi only offers updates when version increases. If fixing a broken extension, increment version above what users have installed.

## Checklist

Before submitting:

- [ ] Extension loads without errors
- [ ] No `CryptoJS` or other unavailable dependencies
- [ ] All required methods implemented
- [ ] index.json entry added/updated
- [ ] Icon added to `javascript/icon/`
- [ ] `validate-index.js` passes
- [ ] `test-extensions.js` passes
- [ ] Tested in actual Mangayomi app (iOS/Android)
- [ ] License header added if vendored
- [ ] Version incremented if replacing existing extension

## Vendoring from Other Repositories

When vendoring:

1. **Check license** - Must be Apache 2.0, MIT, or compatible
2. **Add license header** to source file
3. **Change ID** to avoid conflicts
4. **Update URLs** to point to this repository
5. **Test thoroughly** - upstream code may not work without modification
6. **Document source** in index.json `notes` field

Example header:
```javascript
/*
 * Source Name Extension for Mangayomi
 * 
 * Original Source: upstream-repo/path
 * Repository: https://github.com/upstream/repo
 * License: Apache License 2.0
 * 
 * Copyright YYYY Author Name
 * 
 * Licensed under the Apache License, Version 2.0
 * 
 * Adapted for zetlaska/mangayomi-extensions repository
 * Modified: [list changes]
 */
```

## Common Pitfalls

1. **Null `lang` field** - Always set to a string, even if `langs` array present
2. **CryptoJS usage** - Not available; use Mangayomi bridge functions
3. **Version too low** - Users won't get updates
4. **Cloudflare in tests** - Can't bypass in Node.js; test in app
5. **Missing required methods** - Must implement all 5 core methods
6. **Wrong itemType** - 0=manga, 1=anime, 2=novel (must match content)

## MangaFire: Re-extracting VRF Signing Keys

If MangaFire breaks with **"403 Invalid token"** errors, the VRF signing keys may have changed (tied to their frontend build).

### Symptoms
- Extension fails to load browse/search/detail
- Network errors show 403 responses
- MangaFire site works in browser but not in extension

### Fix: Update MF_ROUNDS Keys

1. **Extract new keys** using `tools/trace2.mjs`:
   ```bash
   cd tools
   node trace2.mjs
   ```
   
   This will:
   - Fetch MangaFire's current frontend bundle
   - Extract the VRF key arrays (`k1`, `k2`, `k3`)
   - Output the new `MF_ROUNDS` constant

2. **Update extension** (`javascript/manga/src/all/mangafire.js`):
   - Find the `MF_ROUNDS` constant (near top of file)
   - Replace all three key arrays with extracted values
   - Increment version (e.g., 0.2.22 → 0.2.23)

3. **Test**:
   ```bash
   cd /workspace
   node tools/test-harness.js
   ```
   
   Should show successful API calls without 403 errors

4. **Update index.json** version to match

5. **Submit PR** with new keys and incremented version

### Key Extraction Details

The keys are embedded in MangaFire's polyfill bundle and used for a 3-round S-box/XOR signing scheme. The `trace2.mjs` tool:
- Fetches the current build manifest
- Downloads the polyfill bundle
- Extracts the three 256-element key arrays
- Formats them as the `MF_ROUNDS` constant

Keys are tied to build ID (e.g., `b9f1b44d...`). When MangaFire deploys a new build, keys change.

## Questions?

Open an issue describing:
- What you're trying to add
- Any errors encountered
- Validation/test results
