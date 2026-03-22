package com.cookit.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class RecipeOverlayService extends Service {
    private static final String TAG = "RecipeOverlayService";
    private static final String CHANNEL_ID = "cookit_overlay_channel";
    private static final int NOTIFICATION_ID = 1;
    
    private WindowManager windowManager;
    private View overlayView;
    private ImageView iconView;
    private String sharedUrl;
    private final OkHttpClient client = new OkHttpClient();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean isExtracting = true;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("url")) {
            sharedUrl = intent.getStringExtra("url");
            
            // Start as foreground service (required for Android O+)
            startForeground(NOTIFICATION_ID, createNotification());
            
            // Show overlay icon
            showOverlay();
            
            // Extract recipe
            extractRecipe();
        }
        return START_NOT_STICKY;
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "CookIt Recipe Extraction",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows progress when extracting recipes");
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    private Notification createNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("CookIt")
                .setContentText(isExtracting ? "מחלץ מתכון..." : "המתכון נשמר!")
                .setSmallIcon(android.R.drawable.ic_menu_edit)
                .setContentIntent(pendingIntent)
                .setOngoing(isExtracting)
                .build();
    }
    
    private void updateNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.notify(NOTIFICATION_ID, createNotification());
    }

    private void showOverlay() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        
        // Create floating icon
        FrameLayout frameLayout = new FrameLayout(this);
        frameLayout.setBackgroundColor(Color.TRANSPARENT);
        
        iconView = new ImageView(this);
        iconView.setImageResource(android.R.drawable.ic_menu_save);
        iconView.setBackgroundColor(Color.parseColor("#2f6d63"));
        iconView.setPadding(30, 30, 30, 30);
        
        int size = (int) (60 * getResources().getDisplayMetrics().density);
        FrameLayout.LayoutParams iconParams = new FrameLayout.LayoutParams(size, size);
        frameLayout.addView(iconView, iconParams);
        
        overlayView = frameLayout;

        final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                size,
                size,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ?
                        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
                        WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 50;
        params.y = 200;

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
                            // Click - open app
                            openAppWithUrl(sharedUrl);
                        }
                        return true;
                }
                return false;
            }
        });

        try {
            windowManager.addView(overlayView, params);
        } catch (Exception e) {
            Log.e(TAG, "Failed to add overlay view", e);
        }
    }

    private void extractRecipe() {
        // Production API URL - update this to your deployed backend URL
        // For local development with emulator: http://10.0.2.2:3001/api/parse?url=
        // For production: https://your-api.onrender.com/api/parse?url=
        String apiUrl = "https://cookit-api.onrender.com/api/parse?url=" + Uri.encode(sharedUrl);
        
        Request request = new Request.Builder()
                .url(apiUrl)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                mainHandler.post(() -> {
                    isExtracting = false;
                    updateNotification();
                    iconView.setBackgroundColor(Color.parseColor("#FF6B6B")); // Red for error
                    showToast("שגיאה בשמירת המתכון");
                    removeOverlayAfterDelay();
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                final String responseBody = response.body().string();
                mainHandler.post(() -> {
                    isExtracting = false;
                    updateNotification();
                    
                    if (response.isSuccessful()) {
                        iconView.setBackgroundColor(Color.parseColor("#4CAF50")); // Green for success
                        String title = extractTitle(responseBody);
                        showToast(title != null ? "נשמר: " + title : "המתכון נשמר!");
                    } else {
                        iconView.setBackgroundColor(Color.parseColor("#FF6B6B")); // Red for error
                        showToast("שגיאה בשמירת המתכון");
                    }
                    removeOverlayAfterDelay();
                });
            }
        });
    }
    
    private String extractTitle(String json) {
        try {
            JSONObject obj = new JSONObject(json);
            JSONObject recipe = obj.getJSONObject("recipe");
            return recipe.getString("title");
        } catch (JSONException e) {
            return null;
        }
    }
    
    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
    
    private void removeOverlayAfterDelay() {
        mainHandler.postDelayed(() -> {
            stopSelf();
        }, 3000); // Keep visible for 3 seconds then remove
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
        if (overlayView != null && windowManager != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                // Ignore
            }
        }
    }
}
