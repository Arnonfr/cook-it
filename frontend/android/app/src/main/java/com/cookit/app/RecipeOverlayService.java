package com.cookit.app;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class RecipeOverlayService extends Service {
    private WindowManager windowManager;
    private View overlayView;
    private String sharedUrl;
    private final OkHttpClient client = new OkHttpClient();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("url")) {
            sharedUrl = intent.getStringExtra("url");
            if (Settings.canDrawOverlays(this)) {
                showOverlay();
                extractRecipe();
            } else {
                // Cannot show overlay, just open the app
                openAppWithUrl(sharedUrl);
                stopSelf();
            }
        }
        return START_NOT_STICKY;
    }

    private void showOverlay() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        
        overlayView = new FrameLayout(this);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(150, 150);
        
        ImageView icon = new ImageView(this);
        icon.setImageResource(android.R.drawable.ic_menu_edit); // Temporary icon
        icon.setBackgroundColor(Color.parseColor("#2f6d63"));
        icon.setPadding(20, 20, 20, 20);
        ((FrameLayout) overlayView).addView(icon, lp);

        final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ?
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
                        WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 100;
        params.y = 100;

        overlayView.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(overlayView, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        float deltaX = event.getRawX() - initialTouchX;
                        float deltaY = event.getRawY() - initialTouchY;
                        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                            openAppWithUrl(sharedUrl);
                        }
                        return true;
                }
                return false;
            }
        });

        windowManager.addView(overlayView, params);
    }

    private void extractRecipe() {
        // Here we would call the backend. 
        // For MVP, we'll just simulate a delay or try a real call if the IP is known.
        // We'll use a placeholder URL or the one provided.
        String apiUrl = "http://10.0.2.2:3001/api/parse?url=" + Uri.encode(sharedUrl);
        
        Request request = new Request.Builder()
                .url(apiUrl)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                mainHandler.post(() -> {
                    Toast.makeText(RecipeOverlayService.this, "Extraction failed", Toast.LENGTH_SHORT).show();
                    // Keep icon for a bit then remove?
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                if (response.isSuccessful()) {
                    mainHandler.post(() -> {
                        Toast.makeText(RecipeOverlayService.this, "Recipe extracted!", Toast.LENGTH_SHORT).show();
                        // Change icon color to signify success
                        overlayView.setBackgroundColor(Color.GREEN);
                    });
                }
            }
        });
    }

    private void openAppWithUrl(String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("cookit://parse?url=" + Uri.encode(url)));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (overlayView != null) {
            windowManager.removeView(overlayView);
        }
    }
}
