#!/usr/bin/env node

// Mock classes that Mangayomi provides
class Client {
    async get(url, options = {}) {
        const https = require('https');
        const http = require('http');
        
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            const headers = options.headers || {};
            
            client.get(url, { headers }, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({ 
                        body, 
                        statusCode: res.statusCode,
                        headers: res.headers 
                    });
                });
            }).on('error', reject);
        });
    }
}

class MProvider {
    constructor() {
        this.source = mangayomiSources[0];
    }
}

// Load the extension
const extensionCode = require('fs').readFileSync(__dirname + '/javascript/manga/src/en/asurascans.js', 'utf8');
const vm = require('vm');
const context = vm.createContext({ 
    MProvider, 
    Client, 
    mangayomiSources: undefined, 
    DefaultExtension: undefined 
});
vm.runInContext(extensionCode, context);
const mangayomiSources = context.mangayomiSources;
const DefaultExtension = context.DefaultExtension;

// Test the extension
async function test() {
    const ext = new DefaultExtension();
    
    console.log('=== Testing Asura Scans Extension ===\n');
    
    // Test 1: Get Popular
    console.log('1. Testing getPopular(1)...');
    try {
        const popular = await ext.getPopular(1);
        console.log(`   ✓ Found ${popular.list.length} manga`);
        console.log(`   ✓ Has next page: ${popular.hasNextPage}`);
        if (popular.list.length > 0) {
            console.log(`   ✓ First manga: ${popular.list[0].name}`);
            console.log(`   ✓ Link: ${popular.list[0].link}`);
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    console.log();
    
    // Test 2: Get Latest Updates
    console.log('2. Testing getLatestUpdates(1)...');
    try {
        const latest = await ext.getLatestUpdates(1);
        console.log(`   ✓ Found ${latest.list.length} manga`);
        console.log(`   ✓ Has next page: ${latest.hasNextPage}`);
        if (latest.list.length > 0) {
            console.log(`   ✓ First manga: ${latest.list[0].name}`);
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    console.log();
    
    // Test 3: Search
    console.log('3. Testing search("nano machine", 1)...');
    try {
        const searchResults = await ext.search("nano machine", 1, []);
        console.log(`   ✓ Found ${searchResults.list.length} results`);
        if (searchResults.list.length > 0) {
            console.log(`   ✓ First result: ${searchResults.list[0].name}`);
            var testMangaUrl = searchResults.list[0].link;
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
    }
    console.log();
    
    // Test 4: Get Detail
    if (testMangaUrl) {
        console.log(`4. Testing getDetail("${testMangaUrl}")...`);
        try {
            const detail = await ext.getDetail(testMangaUrl);
            console.log(`   ✓ Title image: ${detail.imageUrl ? 'Present' : 'Missing'}`);
            console.log(`   ✓ Description: ${detail.description.substring(0, 50)}...`);
            console.log(`   ✓ Author: ${detail.author}`);
            console.log(`   ✓ Artist: ${detail.artist}`);
            console.log(`   ✓ Status: ${detail.status}`);
            console.log(`   ✓ Genres: ${detail.genre.join(', ')}`);
            console.log(`   ✓ Chapters: ${detail.chapters.length}`);
            if (detail.chapters.length > 0) {
                console.log(`   ✓ First chapter: ${detail.chapters[0].name}`);
                console.log(`   ✓ Chapter URL: ${detail.chapters[0].url}`);
                var testChapterUrl = detail.chapters[0].url;
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        console.log();
    }
    
    // Test 5: Get Page List
    if (testChapterUrl) {
        console.log(`5. Testing getPageList("${testChapterUrl}")...`);
        try {
            const pages = await ext.getPageList(testChapterUrl);
            console.log(`   ✓ Found ${pages.length} pages`);
            if (pages.length > 0) {
                console.log(`   ✓ First page: ${pages[0]}`);
                console.log(`   ✓ Last page: ${pages[pages.length - 1]}`);
            }
        } catch (error) {
            console.log(`   ✗ Error: ${error.message}`);
        }
        console.log();
    }
    
    console.log('=== Test Complete ===');
}

test().catch(console.error);
