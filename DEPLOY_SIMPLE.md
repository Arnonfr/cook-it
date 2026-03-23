# הוראות העלאה לאוויר — CookIt

## שלב 1: Neon (מסד נתונים חינמי)

1. כנס ל: https://neon.tech
2. התחבר עם GitHub
3. לחץ **New Project** → שם: `cookit` → Region: EU Frankfurt → Create
4. בדף הפרויקט, לחץ **Connection Details**
5. בחר **Connection string** → Pooled connection → העתק את ה-URL
   - זה ה-`DATABASE_URL` (יש בו `pgbouncer=true`)
6. עבור ל-**Direct connection** → העתק
   - זה ה-`DIRECT_URL`

## שלב 2: API Keys

### Serper (חיפוש Google)
1. כנס ל: https://serper.dev
2. התחבר עם Gmail → לך ל-API Key → העתק

### Gemini (חילוץ מתכונים)
1. כנס ל: https://aistudio.google.com/app/apikey
2. Create API Key → העתק

## שלב 3: עדכון `.env.local` מקומי

ב-`backend/.env.local`:
```
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://[user]:[password]@[host]/cookit?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://[user]:[password]@[host]/cookit?sslmode=require"
GEMINI_API_KEY=AIza...
SERPER_API_KEY=...
```

הרץ מיגרציה מקומית:
```bash
cd backend && npx prisma migrate deploy
```

## שלב 4: העלאה ל-Render

### 4.1 צור Web Service
1. כנס ל: https://render.com → Dashboard → New + → Web Service
2. בחר את ה-repository: `Arnonfr/cook-it`
3. הגדרות:
   - **Name**: `cookit-api`
   - **Region**: Frankfurt
   - **Branch**: main
   - **Build Command**: `cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `cd backend && node dist/index.js`
   - **Plan**: Free

### 4.2 הוסף Environment Variables
Web Service → Environment → Add Environment Variable

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon direct URL |
| `GEMINI_API_KEY` | מ-Google AI Studio |
| `SERPER_API_KEY` | מ-Serper |

### 4.3 Deploy
לחץ: Manual Deploy → Deploy Latest Commit

## שלב 5: בדיקה
```
https://cook-it-29ua.onrender.com/health
```
אמור להחזיר: `{"status":"ok"}`
