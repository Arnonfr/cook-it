package com.cookit.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.DrawableCompat;

public class ShareActivity extends AppCompatActivity {
    private static final String TAG = "ShareActivity";
    private static final String CHANNEL_ID = "cookit_share_channel";
    private static final int NOTIFICATION_ID = 1001;

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
                    String url = extractUrl(sharedText);
                    if (url != null) {
                        Log.d(TAG, "Received shared URL: " + url);
                        handleSharedUrl(url);
                        return;
                    }
                }
            }
        }
        
        finish();
    }
    
    private void handleSharedUrl(String url) {
        // Create notification channel
        createNotificationChannel();
        
        // Show appropriate notification based on Android version
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ - try bubble
            showBubbleNotification(url);
        } else {
            // Older Android - regular notification
            showRegularNotification(url);
        }
        
        // Broadcast to MainActivity
        Intent broadcastIntent = new Intent("com.cookit.app.SHARED_URL");
        broadcastIntent.putExtra("url", url);
        sendBroadcast(broadcastIntent);
        
        // Close immediately
        finish();
    }
    
    private void showBubbleNotification(String url) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Create bubble intent
            Intent bubbleIntent = new Intent(this, BubbleActivity.class);
            bubbleIntent.putExtra("url", url);
            
            PendingIntent bubblePendingIntent = PendingIntent.getActivity(
                    this, 
                    0, 
                    bubbleIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE
            );
            
            // Create adaptive icon for bubble
            Icon bubbleIcon = createBubbleIcon();
            
            // Create bubble metadata
            Notification.BubbleMetadata bubbleData = 
                    new Notification.BubbleMetadata.Builder(bubblePendingIntent, bubbleIcon)
                            .setDesiredHeight(600)
                            .setAutoExpandBubble(false)
                            .setSuppressNotification(false)
                            .build();
            
            // Create main content intent
            PendingIntent contentIntent = getMainActivityIntent(url);
            
            // Build notification
            Notification.Builder builder = new Notification.Builder(this, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_menu_save)
                    .setContentTitle("מתכון חדש נשמר!")
                    .setContentText("לחץ לפתיחה")
                    .setBubbleMetadata(bubbleData)
                    .setContentIntent(contentIntent)
                    .setAutoCancel(true)
                    .setCategory(Notification.CATEGORY_MESSAGE);
            
            // Show notification
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.notify(NOTIFICATION_ID, builder.build());
            
            Log.d(TAG, "Bubble notification shown");
        }
    }
    
    private Icon createBubbleIcon() {
        // Create an adaptive icon for the bubble
        Drawable drawable = ContextCompat.getDrawable(this, android.R.drawable.ic_menu_save);
        if (drawable == null) {
            return Icon.createWithResource(this, android.R.drawable.ic_menu_save);
        }
        
        // Convert drawable to bitmap
        int width = drawable.getIntrinsicWidth();
        int height = drawable.getIntrinsicHeight();
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
        drawable.draw(canvas);
        
        return Icon.createWithAdaptiveBitmap(bitmap);
    }
    
    private void showRegularNotification(String url) {
        Notification notification = buildNotification(url);
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.notify(NOTIFICATION_ID, notification);
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "שיתוף מתכונים",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("התראות בעת שמירת מתכונים");
            
            // Enable bubbles for Android 11+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                channel.setAllowBubbles(true);
            }
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
            
            Log.d(TAG, "Notification channel created, bubbles allowed: " + 
                  (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? channel.canBubble() : "N/A"));
        }
    }
    
    private Notification buildNotification(String url) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_save)
                .setContentTitle("CookIt")
                .setContentText("מתכון נשמר לספרייה!")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(getMainActivityIntent(url))
                .setAutoCancel(true)
                .build();
    }
    
    private PendingIntent getMainActivityIntent(String url) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setAction(Intent.ACTION_VIEW);
        openIntent.setData(Uri.parse("cookit://parse?url=" + Uri.encode(url)));
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        return PendingIntent.getActivity(
                this, 0, openIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
    
    private String extractUrl(String text) {
        String urlPattern = "(https?://[\\w\\-.]+(\\.[a-zA-Z]{2,})(:[0-9]+)?(/[^\\s]*)?)";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(urlPattern);
        java.util.regex.Matcher matcher = pattern.matcher(text);
        
        if (matcher.find()) {
            return matcher.group(1);
        }
        
        if (text.startsWith("http://") || text.startsWith("https://")) {
            return text.split("\\s+")[0];
        }
        
        return null;
    }
}