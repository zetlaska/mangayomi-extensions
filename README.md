# Personal Mangayomi Extensions Repository

This repository contains custom Mangayomi extensions for manga, manhwa, and manhua sources. These extensions are designed to work with [Mangayomi](https://github.com/kodjodevf/mangayomi), the Flutter-based manga/anime/novel reader app.

## Available Extensions

### Asura Scans (English)
- **Version**: 0.1.1
- **Language**: English
- **Type**: Manga/Manhwa/Manhua
- **Format**: JavaScript (iOS compatible)
- **Base URL**: https://asurascans.com
- **Source**: Original (developed for this repository)
- **Features**:
  - Popular manga browsing
  - Latest updates
  - Search functionality
  - Full manga details with genres and metadata
  - Chapter list with dates
  - Page loading with high-quality images

### Mangafire (English)
- **Version**: 0.2.20
- **Language**: English  
- **Type**: Manga (multi-language supported)
- **Format**: JavaScript (iOS compatible)
- **Base URL**: https://mangafire.to
- **Source**: Vendored from entityJY/mangayomi-extensions-eJ
- **License**: Apache License 2.0
- **Cloudflare**: Protected (works in Mangayomi iOS)
- **Features**:
  - Trending and recently updated manga
  - Advanced search with filters (type, genre, status)
  - Multiple view modes (chapter/volume)
  - Manga details with complete metadata
  - Chapter and volume lists
  - High-quality page loading

### Weeb Central (English)
- **Version**: 0.1.0
- **Language**: English
- **Type**: Manga/Manhwa/Manhua  
- **Format**: JavaScript (iOS compatible)
- **Base URL**: https://weebcentral.com
- **Source**: Vendored from entityJY/mangayomi-extensions-eJ
- **License**: Apache License 2.0
- **Cloudflare**: Protected (works in Mangayomi iOS)
- **Features**:
  - Popular and latest updates
  - Advanced search with extensive filters
  - Sorting by popularity, subscribers, updates
  - Filter by status, type, and tags
  - Manga details with complete metadata
  - Chapter lists with dates
  - Image page loading with required headers

## Adding This Repository to Mangayomi (iOS)

1. Open **Mangayomi** on your iOS device
2. Go to **Browse** tab
3. Tap the **Settings** icon (gear) in the top right
4. Select **Extension Repositories**
5. Tap the **+** button to add a new repository
6. Paste this URL:
   ```
   https://raw.githubusercontent.com/zetlaska/mangayomi-extensions/main/index.json
   ```
7. Tap **Add** or **Save**
8. Go back to the **Browse** tab
9. Tap **Filter Manga extensions** at the top
10. Check **Asura Scans** to enable it
11. Start reading!

## Supported Sources (Current)

- ✅ **Asura Scans** - Fully tested and working (original)
- ✅ **Mangafire** - Vendored, Cloudflare protected (works in Mangayomi)
- ✅ **Weeb Central** - Vendored, Cloudflare protected (works in Mangayomi)

## Planned Sources

The following sources are planned for future implementation:

- ⏳ Aqua Manga
- ⏳ Mangafreak
- ⏳ Mangahere
- ⏳ TCB Scans
- ⏳ 1Manga.co
- ⏳ MangaFox
- ⏳ Mangakakalot

## Technical Details

### Extension Format
All extensions in this repository use the **JavaScript format** (`sourceCodeLanguage: 1`), which is fully compatible with iOS devices. This ensures reliable operation on iPhone and iPad.

### API-Based Architecture
The Asura Scans extension uses the official Asura Scans API (`https://api.asurascans.com/api`) for:
- Fast and reliable series discovery
- Direct chapter page loading
- Proper metadata and genre information
- Consistent image delivery

### Premium Content Handling
The extension automatically filters out premium/early-access chapters that haven't been released to the public yet. Once premium chapters become free, they will appear in your chapter list.

## Testing

All extensions have been tested against live data to ensure:
- ✅ Popular series listing works
- ✅ Latest updates work
- ✅ Search functionality works
- ✅ Manga details load correctly
- ✅ Chapter lists are complete
- ✅ Page images load properly
- ✅ Image URLs are accessible and return valid data

## Repository Structure

```
.
├── index.json                          # Main extension index
├── javascript/                         # JavaScript extensions
│   ├── icon/                          # Extension icons
│   │   └── en.asurascans.png          # Asura Scans icon
│   └── manga/                         # Manga extensions
│       └── src/
│           └── en/                    # English sources
│               └── asurascans.js      # Asura Scans extension
└── README.md                          # This file
```

## Version History

### v0.1.0 (Current)
- Initial release
- Added Asura Scans extension
- Full support for browsing, searching, and reading
- iOS-compatible JavaScript format

## License

This repository contains custom extensions for personal use. The extensions interact with publicly available websites and do not host or distribute any manga content. All content belongs to their respective copyright holders.

## Contributing

This is a personal repository, but if you find issues or have suggestions for improvements, feel free to open an issue.

## Credits

- **Mangayomi**: [kodjodevf/mangayomi](https://github.com/kodjodevf/mangayomi)
- **Asura Scans**: https://asurascans.com
- **Mangafire & Weeb Central Extensions**: Vendored from [entityJY/mangayomi-extensions-eJ](https://github.com/entityJY/mangayomi-extensions-eJ)
  - Copyright 2023 Moustapha Kodjo Amadou
  - Licensed under Apache License 2.0
  - Original repository: https://github.com/entityJY/mangayomi-extensions-eJ
- **Mangafire**: https://mangafire.to
- **Weeb Central**: https://weebcentral.com

## License

### Asura Scans Extension
Original work created for this repository.

### Mangafire & Weeb Central Extensions
These extensions are vendored from entityJY/mangayomi-extensions-eJ and distributed under the Apache License 2.0.

```
Copyright 2023 Moustapha Kodjo Amadou

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

Full license text: http://www.apache.org/licenses/LICENSE-2.0

### Modifications
- Changed extension IDs to avoid conflicts with upstream (Mangafire: 123456789, Weeb Central: 987654321)
- Updated icon URLs to point to this repository
- Updated sourceCodeUrl to point to this repository  
- Added license attribution headers to source files

## Disclaimer

These extensions are for personal use only. Please support the official releases and the scanlation teams by visiting their official websites and Discord servers. Consider supporting them through their official channels if you enjoy their work.
