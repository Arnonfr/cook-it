# Cookit — הנחיות למפתח (CLAUDE.md)

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
  routes/recipe.ts           # כל ה-endpoints
  services/
    GoogleSearchService.ts   # חיפוש: Serper → DuckDuckGo → mock
    RecipeParserService.ts   # חילוץ: Gemini → JSON-LD → HTML heuristic
    TranslationService.ts    # תרגום לעברית דרך Gemini
    IngredientImageService.ts
  config/env.ts              # כל env vars עוברים דרך כאן
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

**שים לב:** מודלי Gemini 3 הם `preview` — ה-API key ב-`.env.local` חייב לתמוך בהם.
אם יש שגיאת `API_KEY_INVALID` — צור key חדש ב-[Google AI Studio](https://aistudio.google.com/apikey).

---

## Secrets וסביבות

| משתנה | קובץ | שימוש |
|-------|------|-------|
| `GEMINI_API_KEY` | `backend/.env.local` | חילוץ + תרגום |
| `SERPER_API_KEY` | `backend/.env.local` | חיפוש + תמונות |
| `GOOGLE_API_KEY` | `backend/.env.local` | Google Custom Search (נוכחית לא פעיל) |
| `GOOGLE_CX` | `backend/.env.local` | Google Custom Search engine ID |
| `DATABASE_URL` | `backend/.env` | נתיב SQLite |
| `VITE_API_BASE_URL` | `frontend/.env.local` | `http://localhost:3001` |

**כלל:** אף פעם לא `VITE_*` לסודות. כל מה שעובר לדפדפן הוא ציבורי.

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

## Android (תוכנית עתידית)

ראה `plans/android_implementation.md`. עיקרי:
- Capacitor לעטיפת ה-PWA
- Keep Screen On — `@capacitor-community/keep-screen-on`
- Floating Share Overlay — Java native (`ShareActivity` + `RecipeOverlayService`)
- שיתוף URL מדפדפן/אפליקציה → cookit מחלץ אוטומטית

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
5. `backend/.env.local` מכיל `GEMINI_API_KEY` תקין ל-Gemini 3 preview
