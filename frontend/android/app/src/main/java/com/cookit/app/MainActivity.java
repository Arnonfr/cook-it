package com.cookit.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.cookit.app.plugin.DeepLinkPlugin;

public class MainActivity extends BridgeActivity {
    private static String pendingUrl = null;

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
