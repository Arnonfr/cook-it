# הוראות העלאה לאוויר - CookIt

## שלב 1: קבלת API Keys

### Serper (לחיפוש Google)
1. כנס ל: https://serper.dev
2. התחבר עם Gmail
3. לך ל-API Key
4. העתק את המפתח

### Gemini (לחילוץ מתכונים)
1. כנס ל: https://aistudio.google.com/app/apikey
2. צור API Key חדש
3. העתק את המפתח

## שלב 2: העלאה ל-Render

### 2.1 צור חשבון
1. כנס ל: https://render.com
2. לחץ "Get Started for Free"
3. התחבר עם GitHub

### 2.2 צור Database
1. Dashboard → New + → PostgreSQL
2. שם: `cookit-db`
3. Plan: Free
4. לחץ Create

### 2.3 צור Web Service
1. Dashboard → New + → Web Service
2. בחר את ה-repository: `Arnonfr/cook-it`
3. Settings:
   - **Name**: `cookit-api`
   - **Region**: Frankfurt
   - **Branch**: main
   - **Build Command**: `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `cd backend && node dist/index.js`
   - **Plan**: Free

### 2.4 הוסף Environment Variables
לך ל: Web Service → Environment → Add Environment Variable

הוסף 2 משתנים:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | המפתח שקיבלת מ-Google AI Studio |
| `SERPER_API_KEY` | המפתח שקיבלת מ-Serper |

### 2.5 Deploy
לחץ: Manual Deploy → Deploy Latest Commit

חכה 3-4 דקות עד שיסיים.

## שלב 3: בדיקה

פתח דפדפן:
```
https://cookit-api.onrender.com/api/health
```

אמור להחזיר: `{"status":"ok"}`

## סיום! 🎉

האפליקציה שלך באוויר עם מפתחות מאובטחים!
