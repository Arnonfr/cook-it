#!/usr/bin/env node
/**
 * Browser Bridge for VS Code - Kimi Code Integration
 * Captures emulator screenshots and serves them via HTTP for VS Code to display
 */

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 9223;
const ANDROID_HOME = process.env.ANDROID_HOME || '/Users/hyh/.local/android-sdk';

// Simple HTTP server to serve screenshots
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route: /screenshot - capture emulator screenshot
  if (req.url === '/screenshot' && req.method === 'GET') {
    try {
      const screenshotPath = `/tmp/emulator_${Date.now()}.png`;
      
      // Capture screenshot from emulator
      await new Promise((resolve, reject) => {
        const cmd = `${ANDROID_HOME}/platform-tools/adb shell screencap -p /sdcard/screen.png && ${ANDROID_HOME}/platform-tools/adb pull /sdcard/screen.png ${screenshotPath}`;
        exec(cmd, { timeout: 10000 }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      // Read and serve the image
      const image = fs.readFileSync(screenshotPath);
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(image);

      // Cleanup
      fs.unlinkSync(screenshotPath);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Route: /devices - list connected devices
  if (req.url === '/devices' && req.method === 'GET') {
    exec(`${ANDROID_HOME}/platform-tools/adb devices`, (error, stdout) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ devices: stdout }));
      }
    });
    return;
  }

  // Route: /tap - simulate tap on emulator
  if (req.url === '/tap' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { x, y } = JSON.parse(body);
        const cmd = `${ANDROID_HOME}/platform-tools/adb shell input tap ${x} ${y}`;
        exec(cmd, (error) => {
          if (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          }
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Default: serve simple HTML interface
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Cookit - Android Emulator View</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #2f6d63; }
    #screenshot { max-width: 320px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    button { background: #2f6d63; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin: 5px; }
    button:hover { background: #285c54; }
    .controls { margin: 20px 0; }
  </style>
</head>
<body>
  <h1>📱 Android Emulator - Cookit</h1>
  <div class="controls">
    <button onclick="capture()">📸 צלם מסך</button>
    <button onclick="location.reload()">🔄 רענן</button>
  </div>
  <div id="status">לחץ על "צלם מסך" כדי לראות את האמולטור</div>
  <br>
  <img id="screenshot" style="display:none" />
  
  <script>
    async function capture() {
      document.getElementById('status').textContent = 'מצלם...';
      try {
        const response = await fetch('/screenshot');
        if (response.ok) {
          const blob = await response.blob();
          document.getElementById('screenshot').src = URL.createObjectURL(blob);
          document.getElementById('screenshot').style.display = 'block';
          document.getElementById('status').textContent = '✅ צולם בהצלחה';
        } else {
          document.getElementById('status').textContent = '❌ שגיאה בצילום';
        }
      } catch (e) {
        document.getElementById('status').textContent = '❌ שגיאה: ' + e.message;
      }
    }
    
    // Auto-capture on load
    capture();
  </script>
</body>
</html>
  `);
});

server.listen(PORT, () => {
  console.log(`🌐 Browser Bridge running at http://localhost:${PORT}`);
  console.log(`📱 Connect to emulator and view screenshots in browser/VS Code`);
});
