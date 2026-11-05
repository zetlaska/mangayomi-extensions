# Mangayomi Extensions

Personal extension repository for [Mangayomi](https://github.com/kodjodevf/mangayomi), a Flutter-based manga reader for iOS and Android.

## Available Extensions

| Name | Version | Language | Status | Notes |
|------|---------|----------|--------|-------|
| Asura Scans | 0.1.1 | en | ✅ Working | REST API-based |
| MangaFire | 0.2.21 | en | ✅ Working | Based on kodjodevf v0.1.25 |
| Weeb Central | 0.1.0 | en | ✅ Working | Vendored from entityJY |

All extensions use JavaScript format (`sourceCodeLanguage: 1`) for iOS compatibility.

## Installation

1. Open **Mangayomi** → **Browse** → **Settings** (gear icon)
2. Select **Extension Repositories** → **+** 
3. Add repository URL:
   ```
   https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/index.json
   ```
4. Enable extensions under **Filter Manga extensions**

## Repository Structure

```
├── index.json                     # Extension registry (validated)
├── javascript/
│   ├── icon/                      # Extension icons
│   └── manga/src/
│       ├── en/                    # English extensions
│       │   ├── asurascans.js      # Asura Scans API-based
│       │   └── weebcentral.js     # Weeb Central
│       └── all/
│           └── mangafire.js       # MangaFire (multi-language capable)
├── validate-index.js              # index.json validator
└── test-extensions.js             # Extension test harness
```

## Development

### Validation

```bash
# Validate index.json against Mangayomi Source model
node validate-index.js

# Test all extensions
node test-extensions.js
```

### Adding Extensions

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Extension structure requirements
- Testing against Mangayomi runtime
- Cloudflare handling
- Multi-language support

## Testing Status

| Extension | Load | Browse | Search | Detail | Chapters | Pages |
|-----------|------|--------|--------|--------|----------|-------|
| Asura Scans | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MangaFire | ✅ | ⚠️ Cloudflare* | ⚠️ Cloudflare* | ⚠️ Cloudflare* | ⚠️ Cloudflare* | ⚠️ Cloudflare* |
| Weeb Central | ✅ | ⚠️ Cloudflare* | ⚠️ Cloudflare* | ⚠️ Cloudflare* | ⚠️ Cloudflare* | ⚠️ Cloudflare* |

\* _Works in Mangayomi app (handles Cloudflare JS challenge), but cannot be tested in plain Node.js_

## Known Issues

- **MangaFire v0.2.20 (broken)**: Used `CryptoJS.MD5` which isn't available in Mangayomi's QuickJS runtime
- **MangaFire v0.2.21 (fixed)**: Removed VRF/CryptoJS dependency, based on kodjodevf archived implementation

## Licenses

### Asura Scans Extension
Original work for this repository.

### MangaFire Extension  
Based on kodjodevf/mangayomi-extensions v0.1.25 (archived)
- Copyright 2023 Moustapha Kodjo Amadou
- Licensed under Apache License 2.0
- Modified: ID changed, removed VRF/CryptoJS

### Weeb Central Extension
Vendored from entityJY/mangayomi-extensions-eJ
- Copyright 2023 Moustapha Kodjo Amadou  
- Licensed under Apache License 2.0
- Modified: ID changed, URLs updated

## Disclaimer

For personal use. Extensions interact with publicly available websites and do not host content. All manga content belongs to respective copyright holders. Support official releases and scanlation teams.
