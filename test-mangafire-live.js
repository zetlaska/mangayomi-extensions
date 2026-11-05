#!/usr/bin/env node

const { chromium } = require('playwright-core');

async function testMangaFire() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  console.log('=== Testing MangaFire Live ===\n');
  
  // Test 1: Filter page (trending)
  console.log('1. Testing filter page (trending/popular)...');
  try {
    await page.goto('https://mangafire.to/filter?language=en&sort=trending&page=1', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000);
    
    const content = await page.content();
    const title = await page.title();
    
    console.log('   Page title:', title);
    console.log('   Has div.unit:', content.includes('div class="unit"'));
    
    // Check for manga elements
    const units = await page.$$('div.unit');
    console.log(`   Found ${units.length} manga units`);
    
    if (units.length > 0) {
      const firstUnit = units[0];
      const name = await firstUnit.$eval('div.info > a', el => el.textContent).catch(() => 'N/A');
      const link = await firstUnit.$eval('a', el => el.href).catch(() => 'N/A');
      console.log('   First manga:', name);
      console.log('   Link:', link);
    }
    
    // Check for pagination
    const hasNext = await page.$('li.page-item.active + li');
    console.log('   Has next page:', !!hasNext);
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log();
  
  // Test 2: Check current site structure
  console.log('2. Checking current HTML structure...');
  try {
    await page.goto('https://mangafire.to', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const bodyText = await page.$eval('body', el => el.textContent.substring(0, 200));
    console.log('   Body text preview:', bodyText.trim());
    
    // Check what's actually on the page
    const mainContent = await page.$eval('main, #content, #app', el => el.className).catch(() => 'Not found');
    console.log('   Main content class:', mainContent);
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log();
  
  // Test 3: Search
  console.log('3. Testing search...');
  try {
    await page.goto('https://mangafire.to/filter?keyword=one+piece&language=en&page=1', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000);
    
    const units = await page.$$('div.unit');
    console.log(`   Found ${units.length} search results`);
    
    if (units.length > 0) {
      const firstUnit = units[0];
      const name = await firstUnit.$eval('div.info > a', el => el.textContent).catch(() => 'N/A');
      console.log('   First result:', name);
    }
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log();
  
  // Test 4: Check API endpoints
  console.log('4. Checking if site uses client-side API...');
  try {
    // Listen to network requests
    const apiCalls = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('/ajax/')) {
        apiCalls.push(url);
      }
    });
    
    await page.goto('https://mangafire.to/filter?language=en&sort=trending&page=1', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    
    console.log('   API calls detected:', apiCalls.length);
    apiCalls.slice(0, 5).forEach(url => console.log('   -', url));
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  await browser.close();
  
  console.log('\n=== Test Complete ===');
}

testMangaFire().catch(console.error);
