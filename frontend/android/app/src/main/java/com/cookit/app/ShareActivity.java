package com.cookit.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;

public class ShareActivity extends AppCompatActivity {
    private static final String TAG = "ShareActivity";

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
                        
                        // Send to MainActivity via broadcast
                        Intent broadcastIntent = new Intent("com.cookit.app.SHARED_URL");
                        broadcastIntent.putExtra("url", url);
                        sendBroadcast(broadcastIntent);
                        
                        // Also try to open MainActivity if it's running
                        Intent mainIntent = new Intent(this, MainActivity.class);
                        mainIntent.setAction("android.intent.action.VIEW");
                        mainIntent.setData(android.net.Uri.parse("cookit://parse?url=" + android.net.Uri.encode(url)));
                        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(mainIntent);
                    }
                }
            }
        }
        
        // Close immediately - don't interrupt user's flow
        finish();
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
