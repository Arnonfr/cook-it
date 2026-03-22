# 🔐 ארכיטקטורת אבטחה - CookIt

## סקירה כללית

האפליקציה משתמשת בארכיטקטורת **Backend-Mediated API Keys** - המפתחות נשמרים אך ורק בשרת, הלקוח מבקש דרך ה-backend.

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Android    │ ──── │   Backend    │ ──── │ Gemini API  │
│    App      │      │   (Render)   │      │  Serper API │
│  (no keys)  │      │ (keys here)  │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
```

## 🛡️ שכבות אבטחה

### 1. API Keys אינם בלקוח
- ❌ אין מפתחות בקוד האפליקציה
- ❌ אין מפתחות ב-APK
- ❌ אין מפתחות ב-GitHub
- ✅ מפתחות רק בשרת (Render env vars)

### 2. הגנה על ה-backend

#### Rate Limiting (express-rate-limit)
```javascript
// כלל API: 50 בקשות ל-15 דקות
// Recipe Parse: 20 בקשות לשעה (יקר ב-Gemini)
```

#### Helmet Security Headers
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- ועוד...

#### CORS מוגבל
- ב-production: רק דומיינים מורשים
- בפיתוח: פתוח

### 3. הצפנת מפתחות
- **במנוחה**: משתני סביבה ב-Render (מאובטח)
- **במעבר**: HTTPS בלבד
- **בבסיס נתונים**: מפתחות משתמשים מוצפנים (אם שמורים)

### 4. מסכת מפתחות (Key Masking)
הלקוח רואה רק:
```json
{
  "geminiApiKey": {
    "set": true,
    "valid": true,
    "masked": "AIza...ouMA"
  }
}
```

## 🔑 ניהול מפתחות

### שלך (Admin Keys)
```bash
# Render Dashboard → Environment Variables
GEMINI_API_KEY=AIza...
SERPER_API_KEY=...
```

### של משתמשים (User Keys)
משתמשים יכולים להוסיף מפתחות אישיים דרך:
- Settings → API Keys
- נשמרים ב-.env.local בשרת
- לא חשופים ללקוח אחרים

### העלאה ראשונה ל-Render

1. **אל תכניס מפתחות לקוד!**
   ```bash
   # ❌ לא טוב:
   const API_KEY = "AIza..."
   
   # ✅ טוב:
   const API_KEY = process.env.GEMINI_API_KEY
   ```

2. **הגדר ב-Render:**
   - לך ל-Render Dashboard
   - בחר את ה-Service
   - Environment → Add Environment Variable
   - הוסף את המפתחות

3. **בדוק שהמפתחות לא חשופים:**
   ```bash
   curl https://your-api.onrender.com/api/settings
   # אמור להחזיר רק "masked" versions
   ```

## 🚨 תגובה לתקלות אבטחה

### אם מפתח נחשף
1. **בטל מיד** ב-Google AI Studio / Serper Dashboard
2. **הוצא חדש** והחלף ב-Render
3. **בדוק לוגים** לפעילות חשודה

### אם יש ניסיונות פריצה
1. Rate limiting יחסום אוטומטית
2. בדוק לוגים ב-Render Dashboard
3. שקול להוסיף IP blocking

## 📊 מעקב ולוגים

כל בקשה נרשמת:
```
[2024-03-22T10:00:00Z] GET /api/parse
[2024-03-22T10:00:05Z] POST /api/search
```

בדוק ב-Render Logs לפעילות חשודה.

## 🔒 המלצות נוספות

### לטווח ארוך (Scaling)
1. **API Gateway** - Cloudflare, AWS API Gateway
2. **Secrets Manager** - AWS Secrets Manager, Azure Key Vault
3. **Authentication** - JWT tokens לכל משתמש
4. **Audit Logs** - מי ביקש מה ומתי

### למפתחים בצוות
- אף פעם אל תכניסו מפתחות לקוד
- השתמשו ב-.env.local לפיתוח
- הריצו `git-secrets` למנוע דליפות
