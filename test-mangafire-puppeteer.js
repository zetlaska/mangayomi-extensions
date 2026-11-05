#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testMangaFire() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
  
  console.log('\n=== Testing MangaFire Live ===\n');
  
  // Test 1: Filter page (trending)
  console.log('1. Testing filter page (trending)...');
  try {
    console.log('   Navigating to filter page...');
    await page.goto('https://mangafire.to/filter?language=en&sort=trending&page=1', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    const title = await page.title();
    console.log('   Page title:', title);
    
    // Check for manga elements
    const units = await page.$$('div.unit');
    console.log(`   Found ${units.length} manga units`);
    
    if (units.length > 0) {
      const firstUnit = units[0];
      const name = await firstUnit.$eval('div.info > a', el => el.textContent).catch(() => 'N/A');
      const link = await firstUnit.$eval('a', el => el.href).catch(() => 'N/A');
      console.log('   First manga:', name);
      console.log('   Link:', link);
      
      // Get more titles
      for (let i = 0; i < Math.min(5, units.length); i++) {
        const unit = units[i];
        const name = await unit.$eval('div.info > a', el => el.textContent).catch(() => 'N/A');
        console.log(`   ${i+1}. ${name}`);
      }
    } else {
      // Try to see what's on the page
      const bodyText = await page.$eval('body', el => el.textContent.substring(0, 500));
      console.log('   Body text:', bodyText.trim());
    }
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log();
  
  // Test 2: Page 2
  console.log('2. Testing page 2...');
  try {
    await page.goto('https://mangafire.to/filter?language=en&sort=trending&page=2', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    const units = await page.$$('div.unit');
    console.log(`   Found ${units.length} manga units`);
    
    if (units.length > 0) {
      const firstUnit = units[0];
      const name = await firstUnit.$eval('div.info > a', el => el.textContent).catch(() => 'N/A');
      console.log('   First manga on page 2:', name);
    }
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log();
  
  // Test 3: Search
  console.log('3. Testing search (one piece)...');
  try {
    await page.goto('https://mangafire.to/filter?keyword=one+piece&language=en&page=1', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    const units = await page.$$('div.unit');
    console.log(`   Found ${units.length} search results`);
    
    if (units.length > 0) {
      for (let i = 0; i < Math.min(3, units.length); i++) {
        const unit = units[i];
        const name = await unit.$eval('div.info > a', el => el.textContent).catch(() => 'N/A');
        console.log(`   ${i+1}. ${name}`);
      }
    }
    
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  await browser.close();
  
  console.log('\n=== Test Complete ===');
}

testMangaFire().catch(console.error);
