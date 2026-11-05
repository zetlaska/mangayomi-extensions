#!/usr/bin/env node

const https = require('https');

async function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://asurascans.com'
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ body, statusCode: res.statusCode }));
        }).on('error', reject);
    });
}

async function test() {
    console.log('=== Testing Asura Scans API ===\n');
    
    // Test 1: Get Popular
    console.log('1. Testing Popular Series (page 1)...');
    try {
        const res1 = await httpGet('https://api.asurascans.com/api/series?page=1&order=popular');
        const json1 = JSON.parse(res1.body);
        console.log(`   ✓ Status: ${res1.statusCode}`);
        console.log(`   ✓ Found ${json1.data.length} series`);
        console.log(`   ✓ Has more pages: ${json1.meta.has_more}`);
        console.log(`   ✓ First series: ${json1.data[0].title}`);
        console.log(`   ✓ Cover URL: ${json1.data[0].cover}`);
        console.log(`   ✓ Public URL: ${json1.data[0].public_url}`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    console.log();
    
    // Test 2: Get Latest Updates
    console.log('2. Testing Latest Updates (page 1)...');
    try {
        const res2 = await httpGet('https://api.asurascans.com/api/series?page=1&order=latest');
        const json2 = JSON.parse(res2.body);
        console.log(`   ✓ Status: ${res2.statusCode}`);
        console.log(`   ✓ Found ${json2.data.length} series`);
        console.log(`   ✓ First series: ${json2.data[0].title}`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    console.log();
    
    // Test 3: Search
    console.log('3. Testing Search (query: "nano machine")...');
    try {
        const res3 = await httpGet('https://api.asurascans.com/api/series?page=1&order=latest&search=nano%20machine');
        const json3 = JSON.parse(res3.body);
        console.log(`   ✓ Status: ${res3.statusCode}`);
        console.log(`   ✓ Found ${json3.data.length} results`);
        if (json3.data.length > 0) {
            console.log(`   ✓ First result: ${json3.data[0].title}`);
            console.log(`   ✓ Slug: ${json3.data[0].slug}`);
            var testSlug = json3.data[0].slug;
            var testPublicUrl = json3.data[0].public_url;
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    console.log();
    
    // Test 4: Get Series Details and Chapters
    if (testSlug) {
        console.log(`4. Testing Series Details (slug: ${testPublicUrl.substring(1)})...`);
        try {
            const fullSlug = testPublicUrl.split('/').pop();
            const res4 = await httpGet(`https://api.asurascans.com/api/series/${fullSlug}`);
            const json4 = JSON.parse(res4.body);
            console.log(`   ✓ Status: ${res4.statusCode}`);
            console.log(`   ✓ Title: ${json4.series.title}`);
            console.log(`   ✓ Author: ${json4.series.author}`);
            console.log(`   ✓ Status: ${json4.series.status}`);
            console.log(`   ✓ Description: ${json4.series.description.substring(0, 100)}...`);
            console.log(`   ✓ Genres: ${json4.series.genres.map(g => g.name).join(', ')}`);
            
            const chaptersRes = await httpGet(`https://api.asurascans.com/api/series/${fullSlug}/chapters?page=1&per_page=999`);
            const chaptersJson = JSON.parse(chaptersRes.body);
            console.log(`   ✓ Total chapters: ${chaptersJson.data.length}`);
            if (chaptersJson.data.length > 0) {
                console.log(`   ✓ Latest chapter: Chapter ${chaptersJson.data[0].number} - ${chaptersJson.data[0].title || 'Untitled'}`);
                console.log(`   ✓ Is premium: ${chaptersJson.data[0].is_premium}`);
                var testChapterNum = chaptersJson.data[chaptersJson.data.length - 1].number;
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        console.log();
    }
    
    // Test 5: Get Chapter Pages
    if (testPublicUrl && testChapterNum) {
        const fullSlug = testPublicUrl.split('/').pop();
        console.log(`5. Testing Chapter Pages (chapter ${testChapterNum})...`);
        try {
            const res5 = await httpGet(`https://api.asurascans.com/api/series/${fullSlug}/chapters/${testChapterNum}?include_pages=true`);
            const json5 = JSON.parse(res5.body);
            console.log(`   ✓ Status: ${res5.statusCode}`);
            console.log(`   ✓ Chapter ID: ${json5.data.chapter.id}`);
            console.log(`   ✓ Chapter slug: ${json5.data.chapter.slug}`);
            console.log(`   ✓ Total pages: ${json5.data.chapter.pages.length}`);
            if (json5.data.chapter.pages.length > 0) {
                console.log(`   ✓ First page URL: ${json5.data.chapter.pages[0].url}`);
                console.log(`   ✓ First page dimensions: ${json5.data.chapter.pages[0].width}x${json5.data.chapter.pages[0].height}`);
                console.log(`   ✓ Last page URL: ${json5.data.chapter.pages[json5.data.chapter.pages.length - 1].url}`);
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        console.log();
    }
    
    // Test 6: Verify image URLs are accessible
    if (testPublicUrl && testChapterNum) {
        const fullSlug = testPublicUrl.split('/').pop();
        console.log('6. Testing Image URL accessibility...');
        try {
            const res6 = await httpGet(`https://api.asurascans.com/api/series/${fullSlug}/chapters/${testChapterNum}?include_pages=true`);
            const json6 = JSON.parse(res6.body);
            const firstPageUrl = json6.data.chapter.pages[0].url;
            
            const imgRes = await httpGet(firstPageUrl);
            console.log(`   ✓ Image status: ${imgRes.statusCode}`);
            console.log(`   ✓ Image size: ${imgRes.body.length} bytes`);
            console.log(`   ✓ Image URL: ${firstPageUrl}`);
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        console.log();
    }
    
    console.log('=== All Tests Complete ===');
}

test().catch(console.error);
