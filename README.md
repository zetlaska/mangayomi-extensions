# Personal Mangayomi Extensions Repository

This repository contains custom Mangayomi extensions for manga, manhwa, and manhua sources. These extensions are designed to work with [Mangayomi](https://github.com/kodjodevf/mangayomi), the Flutter-based manga/anime/novel reader app.

## Available Extensions

### Asura Scans (English)
- **Version**: 0.1.0
- **Language**: English
- **Type**: Manga/Manhwa/Manhua
- **Format**: JavaScript (iOS compatible)
- **Base URL**: https://asurascans.com
- **Features**:
  - Popular manga browsing
  - Latest updates
  - Search functionality
  - Full manga details with genres and metadata
  - Chapter list with dates
  - Page loading with high-quality images
  - Automatic skipping of premium/locked chapters

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

- ✅ **Asura Scans** - Fully tested and working

## Planned Sources

The following sources are planned for future implementation:

- ⏳ Aqua Manga
- ⏳ Weeb Central
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

## Disclaimer

These extensions are for personal use only. Please support the official releases and the scanlation teams by visiting their official websites and Discord servers. Consider supporting them through their official channels if you enjoy their work.
