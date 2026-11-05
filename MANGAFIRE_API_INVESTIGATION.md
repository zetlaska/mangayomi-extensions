# MangaFire API Investigation

## Status: BLOCKED - Need User-Provided Responses

MangaFire is fully protected by Cloudflare from this VM. Cannot access:
- HTML pages (filter, manga detail)
- API endpoints  
- CDN (s.mfcdn.nl returns 403)

## What I Need

Please run these requests from your network and provide the responses:

### 1. Browse/Trending (Critical)
```bash
# Get trending manga list
curl -s 'https://mangafire.to/api/v1/manga/trending?page=1&limit=20' \
  -H 'Accept: application/json' \
  -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
```

**Need**: Full JSON response showing manga list structure

### 2. Recently Updated  
```bash
curl -s 'https://mangafire.to/api/v1/manga/recently-updated?page=1&limit=20' \
  -H 'Accept: application/json'
```

### 3. Search
```bash
# Search for "one piece"
curl -s 'https://mangafire.to/api/v1/search?q=one+piece&page=1' \
  -H 'Accept: application/json'
```

### 4. Manga Detail
```bash
# Get manga detail (use any slug from trending/search)
curl -s 'https://mangafire.to/api/v1/manga/[SLUG]' \
  -H 'Accept: application/json'
```

### 5. Chapter List
```bash
# Get chapters for a manga (multi-language aware)
curl -s 'https://mangafire.to/api/v1/manga/[SLUG]/chapters?lang=en' \
  -H 'Accept: application/json'
```

### 6. Chapter Pages
```bash
# Get pages for a specific chapter
curl -s 'https://mangafire.to/api/v1/chapter/[CHAPTER_ID]/pages' \
  -H 'Accept: application/json'
```

### 7. Check Authentication/Tokens
```bash
# See if requests need auth headers or tokens from __config
curl -sv 'https://mangafire.to/api/v1/manga/trending?page=1' \
  -H 'Accept: application/json' 2>&1 | grep -i 'authorization\|x-api\|x-token'
```

### 8. Check __config and __build (from your captured HTML)
From the filter page HTML you captured:
- Extract `window.__config = "..."`
- Extract `window.__build = ...`
- Provide both values

### 9. Bundle Analysis (from your 630KB main bundle)
From `https://s.mfcdn.nl/build/mf/assets/main-tlfroa-CFNRJhF7.js`:
```bash
# Search for API endpoint patterns
grep -o '/api/[^"'\'']*' main-bundle.js | sort -u | head -20

# Search for fetch/axios calls
grep -A 5 -B 5 'fetch.*api' main-bundle.js | head -50

# Search for header/token generation
grep -B 10 'Authorization\|X-Token\|X-API-Key' main-bundle.js | head -50
```

## Alternative Endpoints to Try

If the above don't work, try:
- `/api/manga/filter?...`
- `/api/browse/trending`
- `/api/browse/latest`
- `/api/catalog/...`
- `/graphql` (if they use GraphQL)

## Questions to Answer

1. **Authentication**: Do API requests need tokens, signatures, or special headers?
2. **Rate Limiting**: Any rate limit headers or requirements?
3. **Pagination**: How is pagination handled? (page param, cursor, offset/limit?)
4. **Multi-language**: How does language selection work? Query param, header, or separate endpoints per language?
5. **Image Protection**: Are image URLs signed, scrambled, or need referrer headers?
6. **__config Encoding**: What's in the base64url-ish __config string? Does it contain API keys or endpoints?

## Expected Response Structures (Guess)

Based on common patterns, expecting something like:

### Manga List
```json
{
  "data": [
    {
      "id": "...",
      "slug": "...",
      "title": "...",
      "cover": "https://...",
      "status": "...",
      "type": "..."
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 100,
    "has_next": true
  }
}
```

### Manga Detail
```json
{
  "data": {
    "id": "...",
    "slug": "...",
    "title": "...",
    "description": "...",
    "cover": "...",
    "status": "...",
    "genres": [],
    "chapters": {
      "en": [...],
      "ja": [...]
    }
  }
}
```

### Chapter Pages
```json
{
  "data": {
    "pages": [
      {"url": "https://...", "index": 0},
      {"url": "https://...", "index": 1}
    ]
  }
}
```

## Once I Have the Responses

I will:
1. Map API endpoints to extension methods
2. Handle authentication/tokens if needed
3. Parse JSON responses (no HTML parsing)
4. Implement proper pagination
5. Handle multi-language if supported
6. Verify image URLs and implement any needed transforms
7. Update extension to v0.2.22
8. Test against validation

## Fallback Plan

If MangaFire API is too complex or requires browser-only features:
- **Recommend removing MangaFire** from repository
- It's no longer scrapable (SPA with Cloudflare)
- API requires reverse-engineering that may break frequently
- Focus on working extensions (Asura Scans, Weeb Central)
