#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');

// Mock Mangayomi's Client class - exactly as it works in the app
class Client {
    async get(url, options = {}) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            const headers = options.headers || {};
            
            client.get(url, { headers }, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({ 
                        body,  // Mangayomi returns body as string
                        statusCode: res.statusCode,
                        headers: res.headers 
                    });
                });
            }).on('error', reject);
        });
    }
}

// Mock Mangayomi's MProvider base class
class MProvider {
    constructor() {
        if (typeof mangayomiSources !== 'undefined' && mangayomiSources.length > 0) {
            this.source = mangayomiSources[0];
        }
    }
}

// Load and evaluate the extension exactly like Mangayomi does (using QuickJS-style eval)
const extensionCode = fs.readFileSync(__dirname + '/javascript/manga/src/en/asurascans.js', 'utf8');
// Make MProvider and Client available globally
global.MProvider = MProvider;
global.Client = Client;
eval(extensionCode);
const ext = new global.DefaultExtension();

console.log('=== Mangayomi Runtime Test (Mimics Actual App Behavior) ===\n');
console.log('Extension loaded:', ext.source.name, 'v' + ext.source.version);
console.log();

async function testGetPopular() {
    console.log('TEST 1: getPopular(1)');
    console.log('---');
    
    try {
        const result = await ext.getPopular(1);
        
        console.log('✓ Function returned');
        console.log('✓ Result type:', typeof result);
        console.log('✓ Has list:', Array.isArray(result.list));
        console.log('✓ List length:', result.list.length);
        console.log('✓ Has next page:', result.hasNextPage);
        
        if (result.list.length > 0) {
            console.log('\nFirst 5 manga:');
            result.list.slice(0, 5).forEach((manga, i) => {
                console.log(`  ${i + 1}. ${manga.name}`);
                console.log(`     Link: ${manga.link}`);
            });
        }
        
        return result;
    } catch (error) {
        console.log('✗ Error:', error.message);
        console.log(error.stack);
        return null;
    }
}

async function testGetPopularPage2() {
    console.log('\nTEST 2: getPopular(2) - Testing Pagination');
    console.log('---');
    
    try {
        const result = await ext.getPopular(2);
        
        console.log('✓ Page 2 returned');
        console.log('✓ List length:', result.list.length);
        console.log('✓ Has next page:', result.hasNextPage);
        
        if (result.list.length > 0) {
            console.log('\nFirst 5 manga on page 2:');
            result.list.slice(0, 5).forEach((manga, i) => {
                console.log(`  ${i + 1}. ${manga.name}`);
            });
        }
        
        return result;
    } catch (error) {
        console.log('✗ Error:', error.message);
        return null;
    }
}

async function testLatestUpdates() {
    console.log('\nTEST 3: getLatestUpdates(1)');
    console.log('---');
    
    try {
        const result = await ext.getLatestUpdates(1);
        
        console.log('✓ List length:', result.list.length);
        console.log('✓ Has next page:', result.hasNextPage);
        
        if (result.list.length > 0) {
            console.log('\nFirst 3 latest:');
            result.list.slice(0, 3).forEach((manga, i) => {
                console.log(`  ${i + 1}. ${manga.name}`);
            });
        }
        
        return result;
    } catch (error) {
        console.log('✗ Error:', error.message);
        return null;
    }
}

async function testSearch() {
    console.log('\nTEST 4: search("nano", 1)');
    console.log('---');
    
    try {
        const result = await ext.search("nano", 1, []);
        
        console.log('✓ Search returned');
        console.log('✓ Results:', result.list.length);
        
        if (result.list.length > 0) {
            console.log('\nResults:');
            result.list.forEach((manga, i) => {
                console.log(`  ${i + 1}. ${manga.name}`);
            });
        }
        
        return result;
    } catch (error) {
        console.log('✗ Error:', error.message);
        return null;
    }
}

async function testDetail(url) {
    console.log(`\nTEST 5: getDetail("${url}")`);
    console.log('---');
    
    try {
        const result = await ext.getDetail(url);
        
        console.log('✓ Name:', result.name || 'N/A');
        console.log('✓ Author:', result.author || 'N/A');
        console.log('✓ Status:', result.status);
        console.log('✓ Genres:', result.genre?.join(', ') || 'N/A');
        console.log('✓ Chapters:', result.chapters?.length || 0);
        
        return result;
    } catch (error) {
        console.log('✗ Error:', error.message);
        return null;
    }
}

async function testPageList(url) {
    console.log(`\nTEST 6: getPageList("${url}")`);
    console.log('---');
    
    try {
        const result = await ext.getPageList(url);
        
        console.log('✓ Pages returned:', Array.isArray(result) ? result.length : 'Not an array!');
        
        if (Array.isArray(result) && result.length > 0) {
            console.log('✓ First page:', result[0]);
            console.log('✓ Last page:', result[result.length - 1]);
        }
        
        return result;
    } catch (error) {
        console.log('✗ Error:', error.message);
        return null;
    }
}

async function runAllTests() {
    const page1 = await testGetPopular();
    const page2 = await testGetPopularPage2();
    
    // Verify pagination works
    if (page1 && page2 && page1.list.length > 0 && page2.list.length > 0) {
        console.log('\n--- PAGINATION CHECK ---');
        const page1First = page1.list[0].name;
        const page2First = page2.list[0].name;
        
        if (page1First === page2First) {
            console.log('✗ PAGINATION BROKEN: Page 1 and Page 2 have same first manga!');
            console.log(`  Both start with: ${page1First}`);
        } else {
            console.log('✓ PAGINATION WORKS: Different manga on different pages');
            console.log(`  Page 1 starts: ${page1First}`);
            console.log(`  Page 2 starts: ${page2First}`);
        }
    }
    
    await testLatestUpdates();
    const searchResults = await testSearch();
    
    if (searchResults && searchResults.list.length > 0) {
        const testManga = searchResults.list[0];
        const details = await testDetail(testManga.link);
        
        if (details && details.chapters && details.chapters.length > 0) {
            await testPageList(details.chapters[0].url);
        }
    }
    
    console.log('\n=== All Tests Complete ===');
}

runAllTests().catch(console.error);
