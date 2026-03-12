# Cookit Android App Implementation Plan

This document outlines the steps to convert the Cookit web application into a fully functional Android app with native features like "Keep Screen On" and "Floating Share Overlay".

## 1. Prerequisites
- Node.js & npm
- Android Studio
- A running instance of the Cookit backend (accessible via network)

## 2. Capacitor Setup
1. **Initialize Capacitor**:
   ```bash
   cd frontend
   npm install @capacitor/core @capacitor/cli
   npx cap init Cookit com.cookit.app
   ```
2. **Add Android Platform**:
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```
3. **Build and Sync**:
   ```bash
   npm run build
   npx cap sync
   ```

## 3. Native Features

### A. Keep Screen On
We will use the `@capacitor-community/keep-screen-on` plugin.
1. **Install**:
   ```bash
   npm install @capacitor-community/keep-screen-on
   npx cap sync
   ```
2. **Implementation** (in `frontend/src/App.tsx`):
   ```typescript
   import { KeepScreenOn } from '@capacitor-community/keep-screen-on';

   useEffect(() => {
     const keepAwake = async () => {
       await KeepScreenOn.keepScreenOn();
     };
     keepAwake();
     return () => { KeepScreenOn.restoreScreenOn(); };
   }, []);
   ```

### B. Floating Share Overlay
This requires custom Android code.

#### 1. AndroidManifest.xml
Add a `ShareActivity` and necessary permissions:
```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.INTERNET" />

<activity android:name=".ShareActivity" android:theme="@android:style/Theme.Translucent.NoTitleBar">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>
</activity>
<service android:name=".RecipeOverlayService" android:exported="false" />
```

#### 2. ShareActivity.java
Handles the incoming intent and starts the service.
```java
public class ShareActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent intent = getIntent();
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null) {
                Intent serviceIntent = new Intent(this, RecipeOverlayService.class);
                serviceIntent.putExtra("url", sharedText);
                startService(serviceIntent);
            }
        }
        finish();
    }
}
```

#### 3. RecipeOverlayService.java
Uses `WindowManager` to show the floating icon and performs the background extraction.
- **Key Logic**:
  - Check `Settings.canDrawOverlays(this)`.
  - Create a `View` with a `LayoutParams.TYPE_APPLICATION_OVERLAY`.
  - Use `OkHttp` to call `http://YOUR_API_IP:3001/api/parse?url=...`.
  - On click, start `MainActivity` with the recipe URL as an extra.

## 4. Backend Configuration
Ensure the backend is configured to accept requests from the mobile app's IP and that `VITE_API_BASE_URL` in `frontend/.env` is updated.

---

## 5. Deployment Steps
1. Open `frontend/android` in Android Studio.
2. Generate a signed APK/Bundle.
3. Install on Android device.
