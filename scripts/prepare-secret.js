#!/usr/bin/env node
/**
 * Prepare Firebase Service Account for GitHub Secrets
 * Reads the JSON file and outputs the content for easy copy-paste
 */

const fs = require('fs');
const path = require('path');

const jsonFile = process.argv[2];

if (!jsonFile) {
  console.log(`
🤖 Prepare Firebase Secret for GitHub

Usage: node scripts/prepare-secret.js <path-to-json-file>

Example:
  node scripts/prepare-secret.js ~/Downloads/cook-it-firebase-adminsdk-xxx.json

After running, copy the output and paste it in:
https://github.com/Arnonfr/cook-it/settings/secrets/actions
  `);
  process.exit(0);
}

const fullPath = path.resolve(jsonFile);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ File not found: ${fullPath}`);
  process.exit(1);
}

try {
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Validate it's proper JSON
  JSON.parse(content);
  
  console.log('\n✅ JSON file is valid!\n');
  console.log('📝 Copy the content below and paste in GitHub Secrets:');
  console.log('   Secret name: FIREBASE_SERVICE_ACCOUNT');
  console.log('\n--- START COPY HERE ---\n');
  console.log(content);
  console.log('\n--- END COPY HERE ---\n');
  console.log('🔗 Open: https://github.com/Arnonfr/cook-it/settings/secrets/actions');
  
} catch (e) {
  console.error('❌ Error reading file:', e.message);
  process.exit(1);
}
