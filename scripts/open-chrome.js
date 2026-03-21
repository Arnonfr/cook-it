#!/usr/bin/env node
/**
 * Open Chrome with user's profile for Firebase setup
 * Uses the existing Chrome installation with user's logged-in session
 */

const { exec } = require('child_process');
const os = require('os');

const URLS = {
  firebase: 'https://console.firebase.google.com/',
  githubSecrets: 'https://github.com/Arnonfr/cook-it/settings/secrets/actions',
};

function openChrome(url) {
  const platform = os.platform();
  let cmd;
  
  if (platform === 'darwin') {
    // macOS
    cmd = `open -a "Google Chrome" "${url}"`;
  } else if (platform === 'win32') {
    // Windows
    cmd = `start chrome "${url}"`;
  } else {
    // Linux
    cmd = `google-chrome "${url}" || chromium-browser "${url}"`;
  }
  
  console.log(`🌐 Opening Chrome at: ${url}`);
  console.log('💡 Chrome should open with your existing profile');
  console.log('⚠️  If you\'re not logged in, please log in first');
  
  exec(cmd, (error) => {
    if (error) {
      console.error('❌ Failed to open Chrome:', error.message);
      console.log('\n💡 Alternative: Please open Chrome manually and navigate to:');
      console.log(url);
    } else {
      console.log('✅ Chrome opened successfully');
    }
  });
}

// Main
const target = process.argv[2] || 'help';

switch (target) {
  case 'firebase':
    openChrome(URLS.firebase);
    console.log(`
📝 Instructions for Firebase setup:
1. Click "Create a project" (or select existing)
2. Project name: "cook-it"
3. Accept terms and create
4. Go to Project Settings (⚙️) > Service accounts
5. Click "Generate new private key"
6. Save the JSON file
7. Open: ${URLS.githubSecrets}
8. Add secret: FIREBASE_SERVICE_ACCOUNT
9. Paste the JSON content
10. Save

For Firebase App Distribution:
1. In Firebase Console, go to "App Distribution"
2. Go to "Testers & Groups"
3. Create group "testers"
4. Add email: arnon7700@gmail.com
`);
    break;
    
  case 'github-secrets':
    openChrome(URLS.githubSecrets);
    break;
    
  case 'help':
  default:
    console.log(`
🤖 Chrome Helper

Usage: node scripts/open-chrome.js <target>

Targets:
  firebase         - Open Firebase Console in Chrome
  github-secrets   - Open GitHub Secrets settings

Example:
  node scripts/open-chrome.js firebase
      `);
}
