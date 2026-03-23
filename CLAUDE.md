# Cookit — הנחיות למפתח (CLAUDE.md)

## פורמט תגובות בעברית — RTL חובה

**בכל תגובה בעברית, יש להוסיף את תו ה-Unicode ‏(U+200F RIGHT-TO-LEFT MARK) בתחילת כל פסקה.**
זה גורם ל-Claude.app (Electron/Chromium) ולטרמינל לפרש את הטקסט כ-RTL, כך שמילים באנגלית באמצע משפט לא ישברו את הרצף הויזואלי.
התו נראה כך (בלתי נראה אך קיים): ‏

---

אפליקציית חיפוש וניהול מתכונים בעברית. Full-stack: React frontend + Express backend, SQLite דרך Prisma.

---

## הפעלת סביבת פיתוח

```bash
# backend (port 3001)
cd backend && npm run dev

# frontend (port 5173)
cd frontend && npm run dev
```

שרתים מוגדרים ב-`.claude/launch.json` — השתמש ב-`preview_start` ולא ב-bash ישיר.

---

## ארכיטקטורה

```
frontend/src/
  App.tsx                    # ניהול views: home / search / recipe / profile
  api.ts                     # Axios client → backend :3001
  types.ts                   # SearchResult, ParsedRecipe, Collection
  components/
    RecipeResult.tsx
    Collections.tsx

backend/src/
  routes/recipe.ts           # כל ה-endpoints לחיפוש, חילוץ, שמירה
  routes/settings.ts         # GET/POST /api/settings — ניהול API keys בזמן ריצה
  services/
    GoogleSearchService.ts   # חיפוש: Serper → DuckDuckGo → mock
    RecipeParserService.ts   # חילוץ: Gemini → JSON-LD → HTML heuristic
    TranslationService.ts    # תרגום לעברית דרך Gemini
    IngredientImageService.ts
  config/env.ts              # כל env vars עוברים דרך כאן — אובייקט mutable לעדכון runtime
  data/mockRecipes.ts        # מתכוני ברירת מחדל

backend/prisma/
  schema.prisma              # Recipe, User, SavedRecipe, Collection, caches
```

---

## עקרון ליבה — חיפוש מאתרים אמיתיים (אסור לשבור!)

**המשתמש מחפש ומקבל תוצאות מאתרי מתכונים אמיתיים ברחבי האינטרנט, לא תוכן AI.**

שרשרת החיפוש:
1. **Serper.dev** (Google SERP API) — primary
2. **DuckDuckGo HTML scraping** — fallback אוטומטי אם Serper נכשל
3. **Mock recipes** (DB מקומי) — fallback אחרון בלבד

כל שינוי בזרימת החיפוש **חייב** לשמר את הסדר הזה ואת המקוריות של התוצאות (URL אמיתי, כותרת מקורית, תמונה מהאתר).

### חשוב: `/api/search/unified`
זה ה-endpoint הראשי. מאחד תוצאות מקומיות + ווב, מסיר כפולות, ומתרגם כותרות לא-עבריות.

---

## חילוץ מתכונים — שלושה שלבים

`RecipeParserService.ts` מנסה לפי סדר:

| עדיפות | שיטה | מודל/כלי |
|--------|------|-----------|
| 1 | **Gemini AI** | `gemini-3-flash-preview` |
| 2 | **JSON-LD schema.org** | ללא AI |
| 3 | **HTML heuristic** (Hebrew headings) | ללא AI |

שלב 2 ו-3 עובדים גם בלי API key תקין — המערכת לא נופלת לגמרי.

---

## מודלי AI — Gemini

| שירות | קובץ | מודל |
|-------|------|------|
| חילוץ מתכון מ-HTML | `RecipeParserService.ts:529` | `gemini-3-flash-preview` |
| תרגום כותרות | `TranslationService.ts:63` | `gemini-3.1-flash-lite-preview` |
| תרגום מתכון מלא | `TranslationService.ts:106` | `gemini-3.1-flash-lite-preview` |

**שים לב:** מודלי Gemini 3 הם `preview` — ה-API key חייב לתמוך בהם.
מפתח Gemini תקין מתחיל ב-`AIza` ואורכו 39 תווים.
אם יש שגיאת `API_KEY_INVALID` — צור key חדש ב-[Google AI Studio](https://aistudio.google.com/apikey).

---

## Secrets וסביבות

| משתנה | קובץ | שימוש |
|-------|------|-------|
| `GEMINI_API_KEY` | `backend/.env.local` | חילוץ + תרגום |
| `SERPER_API_KEY` | `backend/.env.local` | חיפוש + תמונות |
| `GOOGLE_API_KEY` | `backend/.env.local` | Google Custom Search (כרגע לא פעיל) |
| `GOOGLE_CX` | `backend/.env.local` | Google Custom Search engine ID |
| `DATABASE_URL` | `backend/.env` | נתיב SQLite |
| `VITE_API_BASE_URL` | `frontend/.env.local` | `http://localhost:3001` (או IP הרשת ל-Android) |

**כלל:** אף פעם לא `VITE_*` לסודות. כל מה שעובר לדפדפן הוא ציבורי.

### ⚠️ Git Secrets — שאלה נפוצה

**Git Secrets הם לא הפתרון כאן.** Git Secrets מיועדים לצינורות CI/CD (GitHub Actions וכו').

האפליקציה עובדת כך:
- **Android APK** ← HTTP → **Backend Express (על המחשב)**
- הבקאנד קורא מפתחות מ-`backend/.env.local` **בזמן ריצה**
- ה-APK לא צריך מפתחות — הוא פשוט קורא REST API

**הפתרון הנכון לבעיה ב-Android:**
1. הבקאנד חייב לרוץ: `cd backend && npm run dev`
2. `backend/.env.local` חייב להכיל מפתחות תקינים (`AIza...` ל-Gemini)
3. המכשיר והמחשב על אותה WiFi
4. `frontend/.env.local` מכיל `VITE_API_BASE_URL=http://[IP_של_המחשב]:3001`

### ניהול מפתחות דרך ה-UI
יש `GET/POST /api/settings` — מאפשר עדכון מפתחות בזמן ריצה דרך דף הפרופיל באפליקציה.
השינויים נכתבים ל-`backend/.env.local` ומתעדכנים מיד (ללא restart לשירותים רוב הפעמים).

---

## עיצוב ו-UI — כללים מחייבים

### שפה וכיווניות
- **עברית בלבד** בממשק המשתמש
- **RTL בכל מקום** — `dir="rtl"`, כיווניות Flexbox/Grid מתאימה
- **פונט:** Noto Sans Hebrew (primary), Heebo (fallback)

### צבעים
| שם | ערך | שימוש |
|----|-----|-------|
| Primary Blue | `#236EFF` | כפתורים ראשיים, active states |
| Deep Blue | `#0B52DB` | hover, headers משניים |
| Accent Orange | `#FF5A37` | מחיקה, שגיאות, הדגשות |
| Accent Yellow | `#FFE600` | תגיות "בהכנה" |
| Background | `#F0F4F8` | רקע הדף |
| Surface | `#FFFFFF` | כרטיסים, מודאלים |
| Text Primary | `#262626` | |
| Text Secondary | `#7B8794` | |
| Border | `#E5E5E5` | |

### קומפוננטים
- **כפתורים:** `border-radius: 12px`, גובה 48–56px
- **כרטיסי מתכון:** תמונה 4:3 או 16:9, `border-radius: 12px`, `box-shadow: 0 4px 12px rgba(0,0,0,0.05)`
- **Inputs:** פינות מעוגלות 12px, אייקון חיפוש בצד שמאל (RTL)
- **Glassmorphism:** לניווט ו-overlays — `backdrop-filter: blur(8px)`, `background: rgba(255,255,255,0.7)`
- **אנימציות:** scale-up עדין ב-hover על כרטיסים, transitions חלקות לכפתורים

### עיצוב פרמיום — אסור להפוך גנרי
האפליקציה מכוונת למראה מוקפד ולא לעיצוב טמפלייט גנרי. כל שינוי UI חייב לשמר את האסתטיקה.

---

## מסד הנתונים

SQLite דרך Prisma. מודלים עיקריים:

- `Recipe` — URL מקור, JSON מנותח, JSON מתורגם, שפת מקור, סטטוס parse
- `User` — אימייל, preferences
- `SavedRecipe` — many-to-many user↔recipe
- `Collection` / `CollectionItem` — אוספי מתכונים
- `UrlCache` — HTML cache (24 שעות)
- `SearchCache` — תוצאות חיפוש cache (24 שעות)
- `IngredientImage` / `StepImage` — cache לתמונות

```bash
# הרצת מיגרציות
cd backend && npx prisma migrate dev
# צפייה בנתונים
npx prisma studio
```

---

## תמיכה בעברית בחילוץ

- **Hebrew prefix stripping:** מסנן קידומות `ה/ב/ל/מ/כ` בהתאמת מצרכים לשלבים
- **Headings detection:** מחפש `מצרכים|מרכיבים|חומרים` ו-`אופן הכנה|הוראות הכנה|שלבי הכנה`
- **תרגום אוטומטי:** מתכוני אנגלית/צרפתית/ספרדית וכו' מתורגמים לעברית לאחר חילוץ
- **שמירת מקור:** `originalRecipe` נשמר יחד עם הגרסה המתורגמת

---

## Android

ראה `plans/android_implementation.md`. עיקרי:
- Capacitor לעטיפת ה-PWA
- ה-APK בנוי ומוכן (בנוי עם JDK 21 Temurin + Android SDK build-tools 36)
- Keep Screen On — `@capacitor-community/keep-screen-on`
- Floating Share Overlay — Java native (`ShareActivity` + `RecipeOverlayService`)
- שיתוף URL מדפדפן/אפליקציה → cookit מחלץ אוטומטית

### בנייה מחדש של APK
```bash
cd frontend
VITE_API_BASE_URL=http://[IP]:3001 npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## לעתיד — Gemini Embedding 2

גוגל שחררו ב-10.3.2026 מודל embedding multimodal ראשון (`gemini-embedding-2-preview`).
פוטנציאל לשדרוג חיפוש סמנטי בתוך ה-DB המקומי (לא מחליף חיפוש ממאתרים אמיתיים!).
עלות: ~$0.0002 למתכון. נדרש: vector DB (כגון `sqlite-vec`).

---

## נקודות בדיקה אחרי שינויים

1. חיפוש בעברית → מחזיר תוצאות מאתרים אמיתיים (לא mock בלבד)
2. לחיצה על תוצאה → מתכון מנותח עם מצרכים ושלבים
3. מתכון אנגלי → מתורגם לעברית
4. UI נשמר RTL בכל הדפים
5. `backend/.env.local` מכיל `GEMINI_API_KEY` תקין (`AIza...`) ל-Gemini 3 preview
6. `backend/.env.local` מכיל `SERPER_API_KEY` תקין מ-serper.dev
7. `GET /api/settings` מחזיר `valid: true` לשני המפתחות
