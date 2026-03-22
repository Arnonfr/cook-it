# מדריך העלאה לאוויר (Production Deployment)

## שלב 1: העלאת ה-backend ל-Render

### 1.1 צור חשבון ב-Render
- כנס ל: https://render.com
- התחבר עם GitHub

### 1.2 צור PostgreSQL Database
- בלוח הבקרה לחץ "New +"
- בחר "PostgreSQL"
- שם: `cookit-db`
- תוכנית: `Free`
- לחץ "Create Database"

### 1.3 צור Web Service
- בלוח הבקרה לחץ "New +"
- בחר "Web Service"
- בחר את הריפו `Arnonfr/cook-it`
- הגדרות:
  - **Name**: `cookit-api`
  - **Runtime**: `Node`
  - **Build Command**: `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
  - **Start Command**: `cd backend && node dist/index.js`
  - **Plan**: `Free`

### 1.4 הגדר משתני סביבה
בתוך ההגדרות של ה-web service, הוסף:
- `GEMINI_API_KEY` - המפתח שלך מ-Google AI Studio
- `SERPER_API_KEY` - המפתח שלך מ-Serper.dev
- `DATABASE_URL` - Render ימלא אוטומטית (Internal Database URL)

### 1.5 Deploy
לחץ "Manual Deploy" → "Deploy latest commit"

כתובת ה-API תהיה: `https://cookit-api.onrender.com`

---

## שלב 2: עדכון ה-Frontend

### 2.1 עדכן את כתובת ה-API
הקובץ `.env.production` כבר מכיל את ה-URL. אם השתמשת בשם אחר:
```bash
# frontend/.env.production
VITE_API_BASE_URL=https://cookit-api.onrender.com/api
```

### 2.2 עדכן את Android Service
הקובץ `RecipeOverlayService.java` כבר מכיל את ה-URL. אם השתמשת בשם אחר:
```java
String apiUrl = "https://cookit-api.onrender.com/api/parse?url=" + Uri.encode(sharedUrl);
```

---

## שלב 3: בניית APK ל-production

```bash
# 1. בנה את ה-frontend עם משתני production
cd frontend
npm run build

# 2. העתק ל-android
cp -r dist/* android/app/src/main/assets/public/

# 3. בנה APK
cd android
./gradlew assembleRelease

# 4. ה-APK יהיה ב:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## שלב 4: העלאה ל-Firebase App Distribution

ה-APK יופץ אוטומטית דרך GitHub Actions כשתעלה commit ל-main.

או ידנית:
```bash
# התקן Firebase CLI
npm install -g firebase-tools

# התחבר
firebase login

# העלה
firebase appdistribution:distribute android/app/build/outputs/apk/release/app-release.apk \
  --app <YOUR_APP_ID> \
  --groups testers
```

---

## 🔧 פתרון בעיות

### בעיה: "Free tier sleeps after 15 minutes"
**פתרון**: זה בסדר! כשהאפליקציה תשלח בקשה, Render "יתעורר" תוך 30-60 שניות. המשתמש יראה מסך טעינה בינתיים.

### בעיה: "Database connection failed"
**פתרון**: ודא שהגדרת את `DATABASE_URL` נכון. צריך להיות בפורמט:
```
postgresql://user:password@host:port/database
```

### בעיה: "CORS error"
**פתרון**: ה-backend כבר מוגדר עם CORS מתאים. אם יש בעיה, בדוק שה-URL ב-frontend תואם ל-URL של Render.
