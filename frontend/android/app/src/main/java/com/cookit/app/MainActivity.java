package com.cookit.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.cookit.app.plugin.DeepLinkPlugin;

public class MainActivity extends BridgeActivity {
    private static String pendingUrl = null;
    private BroadcastReceiver shareReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeepLinkPlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
        
        // Allow mixed content (HTTP on HTTPS) for local development
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        
        // Register receiver for shared URLs
        registerShareReceiver();
    }
    
    private void registerShareReceiver() {
        shareReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.cookit.app.SHARED_URL".equals(intent.getAction())) {
                    String url = intent.getStringExtra("url");
                    if (url != null) {
                        pendingUrl = "cookit://parse?url=" + url;
                    }
                }
            }
        };
        
        IntentFilter filter = new IntentFilter("com.cookit.app.SHARED_URL");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.registerReceiver(this, shareReceiver, filter, ContextCompat.RECEIVER_EXPORTED);
        } else {
            registerReceiver(shareReceiver, filter);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (shareReceiver != null) {
            unregisterReceiver(shareReceiver);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.getData() != null) {
            String url = intent.getData().toString();
            if (url.startsWith("cookit://")) {
                pendingUrl = url;
            }
        }
    }

    // Called from JS to check for pending deep link
    public static String getPendingUrl() {
        String url = pendingUrl;
        pendingUrl = null;
        return url;
    }
}
