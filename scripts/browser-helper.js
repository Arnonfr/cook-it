#!/usr/bin/env node
/**
 * Browser Helper - Playwright-based browser automation
 * Opens browser for manual interaction when needed
 */

const { chromium } = require('playwright');

const URLS = {
  firebase: 'https://console.firebase.google.com/',
  githubSecrets: 'https://github.com/Arnonfr/cook-it/settings/secrets/actions',
  githubActions: 'https://github.com/Arnonfr/cook-it/actions',
};

async function openBrowser(url) {
  console.log(`🌐 Opening browser at: ${url}`);
  console.log('💡 You can interact with the browser manually');
  console.log('⚠️  Close the browser tab when done');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  await page.goto(url);
  
  // Keep browser open until manually closed
  await new Promise(resolve => {
    browser.on('disconnected', resolve);
  });
  
  console.log('✅ Browser closed');
}

// Main
const target = process.argv[2] || 'help';

(async () => {
  switch (target) {
    case 'firebase':
      await openBrowser(URLS.firebase);
      break;
    case 'github-secrets':
      await openBrowser(URLS.githubSecrets);
      break;
    case 'github-actions':
      await openBrowser(URLS.githubActions);
      break;
    case 'help':
    default:
      console.log(`
🤖 Browser Helper

Usage: node scripts/browser-helper.js <target>

Targets:
  firebase         - Open Firebase Console
  github-secrets   - Open GitHub Secrets settings
  github-actions   - Open GitHub Actions

Example:
  node scripts/browser-helper.js firebase
      `);
  }
})();
