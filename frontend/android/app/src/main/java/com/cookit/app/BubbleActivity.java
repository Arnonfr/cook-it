package com.cookit.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

public class BubbleActivity extends Activity {
    private static final String TAG = "BubbleActivity";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Set transparent background for bubble
        setTheme(android.R.style.Theme_DeviceDefault_Light_Dialog);
        
        // Get URL from intent
        String url = getIntent().getStringExtra("url");
        if (url == null) {
            finish();
            return;
        }
        
        // Create simple UI
        setContentView(R.layout.bubble_layout);
        
        TextView titleText = findViewById(R.id.bubble_title);
        TextView urlText = findViewById(R.id.bubble_url);
        Button openButton = findViewById(R.id.bubble_open);
        Button dismissButton = findViewById(R.id.bubble_dismiss);
        
        titleText.setText("מתכון חדש!");
        urlText.setText(url);
        
        openButton.setOnClickListener(v -> {
            // Open in MainActivity
            Intent intent = new Intent(this, MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW);
            intent.setData(Uri.parse("cookit://parse?url=" + Uri.encode(url)));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            finish();
        });
        
        dismissButton.setOnClickListener(v -> {
            Toast.makeText(this, "נשמר לספרייה", Toast.LENGTH_SHORT).show();
            finish();
        });
    }
}