# הגדרת Firebase App Distribution

## שלב 1: יצירת פרויקט Firebase

1. היכנס ל-[Firebase Console](https://console.firebase.google.com/)
2. צור פרויקט חדש בשם "Cookit"
3. הוסף אפליקציית Android:
   - Package name: `com.cookit.app`
   - SHA-1: (אופציונלי ל-debug)

## שלב 2: הגדרת App Distribution

1. בתפריט השמאלי, בחר ב-**App Distribution**
2. לחץ על **Get Started**
3. צור קבוצת בודקים:
   - שם: "Testers"
   - הוסף אימיילים של בודקים

## שלב 3: הגדרת Secrets ב-GitHub

הוסף את ה-secrets הבאים בהגדרות הריפו (Settings → Secrets and variables → Actions):

### חובה:
```
FIREBASE_APP_ID_ANDROID=1:123456789:android:abcdef123456
FIREBASE_SERVICE_ACCOUNT={json של service account}
```

### לחתימת Release (אופציונלי):
```
SIGNING_KEY_BASE64={keystore ב-base64}
ALIAS=cookit
KEY_STORE_PASSWORD=password
KEY_PASSWORD=password
```

## שלב 4: יצירת Service Account

1. היכנס ל-[Google Cloud Console](https://console.cloud.google.com/)
2. בחר בפרויקט Firebase שלך
3. IAM & Admin → Service Accounts
4. צור Service Account חדש:
   - שם: `github-actions-distribution`
   - תפקיד: `Firebase App Distribution Admin`
5. צור מפתח JSON והורד אותו
6. העתק את התוכן ל-secret `FIREBASE_SERVICE_ACCOUNT`

## שלב 5: קבלת App ID

ה-App ID נמצא ב:
- Firebase Console → Project Settings → General
- תחת "Your apps" → Android

או בקובץ `google-services.json`:
```json
{
  "client": [{
    "client_info": {
      "mobilesdk_app_id": "1:123456789:android:abcdef123456"
    }
  }]
}
```

## שלב 6: הרצה ידנית

אפשר להריץ את ה-workflow ידנית דרך:
- GitHub → Actions → Build & Distribute Android App
- לחץ על "Run workflow"

## שלב 7: צפייה בחלוקה

1. היכנס ל-[Firebase Console](https://console.firebase.google.com/)
2. App Distribution
3. תראה את ה-buildים שהועלו
4. הבודקים יקבלו מייל עם הורדה

## תהליך אוטומטי

עכשיו כל push ל-main יבנה וישלח אוטומטית לבודקים!

## הוספת בודקים

בודקים חדשים יכולים להצטרף דרך:
1. קישור הזמנה במייל
2. אפליקציית Firebase App Tester (ב-play store)
