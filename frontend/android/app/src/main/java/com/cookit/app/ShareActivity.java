package com.cookit.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class ShareActivity extends AppCompatActivity {
    private static final String TAG = "ShareActivity";
    private static final int REQUEST_OVERLAY_PERMISSION = 1001;
    private String pendingUrl = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null) {
                    // Extract URL from shared text
                    String url = extractUrl(sharedText);
                    if (url != null) {
                        Log.d(TAG, "Received shared URL: " + url);
                        handleSharedUrl(url);
                        return; // Don't finish yet, wait for permission result if needed
                    }
                }
            }
        }
        
        // No valid URL found, close immediately
        finish();
    }
    
    private void handleSharedUrl(String url) {
        // Check if we have overlay permission (needed for floating icon)
        if (Settings.canDrawOverlays(this)) {
            // Start overlay service to show floating icon
            startOverlayService(url);
            
            // Show toast to user
            Toast.makeText(this, "שומר מתכון...", Toast.LENGTH_SHORT).show();
            
            // Close immediately - don't switch to app
            finish();
        } else {
            // No overlay permission - save URL for later and request permission
            pendingUrl = url;
            requestOverlayPermission();
        }
    }
    
    private void startOverlayService(String url) {
        Intent serviceIntent = new Intent(this, RecipeOverlayService.class);
        serviceIntent.putExtra("url", url);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
        
        // Also broadcast to MainActivity if it's running
        Intent broadcastIntent = new Intent("com.cookit.app.SHARED_URL");
        broadcastIntent.putExtra("url", url);
        sendBroadcast(broadcastIntent);
    }
    
    private void requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION);
        } else {
            // Older versions don't need permission, just proceed
            if (pendingUrl != null) {
                startOverlayService(pendingUrl);
                finish();
            }
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_OVERLAY_PERMISSION) {
            if (Settings.canDrawOverlays(this) && pendingUrl != null) {
                // Permission granted, start overlay
                startOverlayService(pendingUrl);
                Toast.makeText(this, "שומר מתכון...", Toast.LENGTH_SHORT).show();
            } else {
                // Permission denied - fallback to opening app
                Toast.makeText(this, "נדרשת הרשאה להצגת חלון צף", Toast.LENGTH_LONG).show();
                openMainActivity(pendingUrl);
            }
            pendingUrl = null;
            finish();
        }
    }
    
    private void openMainActivity(String url) {
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setAction(Intent.ACTION_VIEW);
        mainIntent.setData(Uri.parse("cookit://parse?url=" + Uri.encode(url)));
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(mainIntent);
    }
    
    private String extractUrl(String text) {
        // Simple URL extraction - finds first URL in text
        String urlPattern = "(https?://[\\w\\-.]+(\\.[a-zA-Z]{2,})(:[0-9]+)?(/[^\\s]*)?)";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(urlPattern);
        java.util.regex.Matcher matcher = pattern.matcher(text);
        
        if (matcher.find()) {
            return matcher.group(1);
        }
        
        // If no URL found but text looks like a URL, return it
        if (text.startsWith("http://") || text.startsWith("https://")) {
            return text.split("\\s+")[0];
        }
        
        return null;
    }
}
