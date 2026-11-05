# Bug Fix Report - Asura Scans Extension v0.1.1

## Issue Summary

**User Report**: Extension only showed 1 manga ("Mookhyang The Origin") instead of 20, and pagination showed the same manga repeatedly.

## Root Causes Identified

### 1. Dropped Status Filter (PRIMARY ISSUE)
**Problem**: Extension filtered out all series with `status: "dropped"`

**Evidence**:
```bash
$ curl -sL "https://api.asurascans.com/api/series?page=1&order=popular" | \
  jq '[.data[] | .status] | group_by(.) | map({status: .[0], count: length})'

[
  { "status": "completed", "count": 1 },   # Only Mookhyang The Origin
  { "status": "dropped", "count": 19 }     # All other series filtered out!
]
```

**Root Cause**: The API marks older/inactive series as "dropped", but they still have readable chapters. The extension incorrectly treated this as "should not display."

**Fix**: Removed the `if (item.status === "dropped") continue;` filter in `parseSeriesList()`

### 2. Pagination Not Working (SECONDARY ISSUE)
**Problem**: API's `page` parameter was ignored, always returning same results

**Evidence**:
```bash
# Page 1
$ curl -sL "https://api.asurascans.com/api/series?page=1&order=popular" | \
  jq '.data[0:3] | .[] | .title'
"The First Order"
"Shenwu Tianzun"
"Legend of Mir: The Golden Armored Dragon"

# Page 2 - SAME RESULTS!
$ curl -sL "https://api.asurascans.com/api/series?page=2&order=popular" | \
  jq '.data[0:3] | .[] | .title'  
"The First Order"
"Shenwu Tianzun"
"Legend of Mir: The Golden Armored Dragon"
```

**Working Solution**: API supports `offset` and `limit` parameters instead

**Evidence of Fix**:
```bash
# offset=0
$ curl -sL "https://api.asurascans.com/api/series?limit=20&offset=0&order=latest" | \
  jq '[.data[0:3] | .[] | .title]'
["The First Order", "Shenwu Tianzun", "Legend of Mir: The Golden Armored Dragon"]

# offset=20 - DIFFERENT RESULTS!
$ curl -sL "https://api.asurascans.com/api/series?limit=20&offset=20&order=latest" | \
  jq '[.data[0:3] | .[] | .title]'
["The Frenzy Of Evolution", "I Shall Live As a Prince", "Ultra Alter"]

# offset=40 - MORE DIFFERENT RESULTS!
$ curl -sL "https://api.asurascans.com/api/series?limit=20&offset=40&order=latest" | \
  jq '[.data[0:3] | .[] | .title]'
["My Path to Killing Gods in Another World", "I Regressed As The Duke", "Dangerous Dungeon Escape"]
```

**Fix**: Changed from `?page=${page}` to `?limit=20&offset=${(page-1)*20}`

## Changes Made

### 1. Removed Status Filter
**File**: `javascript/manga/src/en/asurascans.js`

**Before**:
```javascript
for (const item of json.data) {
    if (item.status === "dropped") continue;  // ← REMOVED THIS
    list.push({ name: item.title, imageUrl: item.cover, link: item.public_url.substring(1) });
}
```

**After**:
```javascript
for (const item of json.data) {
    list.push({ name: item.title, imageUrl: item.cover, link: item.public_url.substring(1) });
}
```

### 2. Fixed Pagination Parameters
**File**: `javascript/manga/src/en/asurascans.js`

**Before**:
```javascript
async getPopular(page) {
    const url = `${this.source.apiUrl}/series?page=${page}&order=popular`;
    // ...
}
```

**After**:
```javascript
async getPopular(page) {
    const limit = 20;
    const offset = (page - 1) * limit;
    const url = `${this.source.apiUrl}/series?limit=${limit}&offset=${offset}&order=popular`;
    // ...
}
```

Applied to:
- `getPopular(page)`
- `getLatestUpdates(page)`
- `search(query, page, filters)`

### 3. Version Bump
- Extension version: `0.1.0` → `0.1.1`
- Updated in both:
  - `javascript/manga/src/en/asurascans.js`
  - `index.json`

## Verification

### Manual Test Results
```bash
$ node -e "
  # [Extension code loaded]
  const r1 = await ext.getPopular(1);
  const r2 = await ext.getPopular(2);
  console.log('Page 1:', r1.list.length, 'items, first:', r1.list[0].name);
  console.log('Page 2:', r2.list.length, 'items, first:', r2.list[0].name);
  console.log('Different:', r1.list[0].name !== r2.list[0].name);
"

Page 1: 20 items, first: The First Order
Page 2: 20 items, first: The Frenzy Of Evolution
Different: true
```

✅ All 20 manga now appear  
✅ Page 1 and Page 2 return different results  
✅ Pagination works correctly  

## Why My Original Test Missed This

**Original Test Harness Limitation**: 
- Used direct HTTP calls to the API
- Never executed the extension's JavaScript parsing logic
- Didn't catch the `status === "dropped"` filter

**Lesson Learned**: Need to test the actual JavaScript execution, not just API responses.

## Deployment

- **Version**: 0.1.1
- **Release Date**: November 5, 2026
- **Breaking Changes**: None
- **Migration**: Users will see update notification in Mangayomi and can update the extension

## Affected Users

All iOS users who installed v0.1.0 will:
1. See update notification in Mangayomi
2. Update to v0.1.1
3. Immediately see all 20 manga per page instead of 1
4. Experience working pagination

## Prevention

Future extensions should:
1. Always test actual JavaScript execution, not just API calls
2. Never filter by status unless confirmed it means "no chapters available"
3. Verify pagination works with live page 1 vs page 2 comparisons
4. Test with API's actual data patterns (dropped/ongoing/completed)
