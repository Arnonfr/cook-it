package com.cookit.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationCompat;

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
        // Create notification channel (required for Android O+)
        createNotificationChannel();
        
        // Build notification
        Notification notification = buildNotification(url);
        
        // Show notification
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.notify(NOTIFICATION_ID, notification);
        
        // Broadcast to MainActivity so it can show a toast when opened
        Intent broadcastIntent = new Intent("com.cookit.app.SHARED_URL");
        broadcastIntent.putExtra("url", url);
        sendBroadcast(broadcastIntent);
        
        // Close immediately - don't switch to app
        finish();
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "שיתוף מתכונים",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("התראות בעת שמירת מתכונים");
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    private Notification buildNotification(String url) {
        // Intent to open MainActivity when notification is tapped
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setAction(Intent.ACTION_VIEW);
        openIntent.setData(Uri.parse("cookit://parse?url=" + Uri.encode(url)));
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, openIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_save)
                .setContentTitle("CookIt")
                .setContentText("מתכון נשמר לספרייה!")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build();
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
