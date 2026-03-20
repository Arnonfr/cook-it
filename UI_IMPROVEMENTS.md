# שיפורי UI - Cookit

## בעיות שזוהו

### 1. כפתורים שלא עובדים / לא ברורים
- [ ] כפתור **הדפסה** - צריך CSS מתאים להדפסה
- [ ] כפתור **שיתוף** - Web Share API לא תמיד נתמך
- [ ] כפתור **מקור** ב-header - מוביל לאתר חיצוני שאולי חסום

### 2. חסרים פיצ'רים חשובים
- [ ] **מד התקדמות** - כמה שלבים השלמתי?
- [ ] **טיימר גלובלי** לכל המתכון
- [ ] **רשימת קניות** - ייצוא מרכיבים

### 3. ממשק מיותר / מסורבל
- [ ] מחשבון תבניות - מורכב מדי למשתמש ממוצע
- [ ] 3 טאבים - אפשר למזג "מקור" עם "שלבים"

## שיפורים מומלצים

### מסך מתכון - שינויים

```diff
+ הוסף: מד התקדמות צף (floating progress bar)
+ הוסף: "סיים מתכון" כפתור גדול בסוף
+ הוסף: טיימר כולל ליד הזמן הכולל

- הסר: מחשבון תבניות (העבר להגדרות מתקדמות)
- הסר: טאב "מקור" (שים בקישור פשוט)
```

### תיקוני CSS דחופים

```css
/* הדפסה - הסתר אלמנטים מיותרים */
@media print {
    .no-print { display: none !important; }
    .recipe-content { max-width: 100%; }
    header { position: static; }
}

/* שיתוף - fallback לclipboard */
.share-fallback {
    /* כש-web share לא זמין */
}
```

## קוד לשינוי

### 1. הוספת מד התקדמות
```tsx
// FloatingProgress.tsx
const FloatingProgress = ({ completed, total }) => {
    const percent = Math.round((completed / total) * 100);
    return (
        <div className="fixed bottom-4 left-4 right-4 bg-white shadow-lg rounded-2xl p-4 z-50">
            <div className="flex justify-between mb-2">
                <span>התקדמות: {percent}%</span>
                <span>{completed}/{total} שלבים</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full">
                <div 
                    className="h-full bg-[#2f6d63] rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
};
```

### 2. שיתוף עם fallback
```tsx
const handleShare = async () => {
    const shareData = {
        title: recipe.title,
        text: `מתכון ל${recipe.title} ב-Cookit!`,
        url: window.location.href
    };
    
    if (navigator.share) {
        await navigator.share(shareData);
    } else {
        // Fallback: העתק ללוח
        await navigator.clipboard.writeText(
            `${shareData.title}\n${shareData.url}`
        );
        toast.success('הקישור הועתק!');
    }
};
```

### 3. הדפסה נכונה
```tsx
const handlePrint = () => {
    // הוסף class להדפסה
    document.body.classList.add('printing');
    window.print();
    document.body.classList.remove('printing');
};
```

## ניווט מוצע חדש

```
מסך ראשי:
├── שורת חיפוש
├── קטגוריות מהירות
├── מתכונים אחרונים (קארוסל)
└── המתכונים שלי (רשימה)

מסך חיפוש:
├── שורת חיפוש
├── תוצאות מקומיות (אם יש)
└── תוצאות מהאינטרנט

מסך מתכון:
├── תמונה + כותרת + מידע בסיסי
├── טאבים: מצרכים | שלבים
│   ├── מצרכים: רשימה + התאמת כמויות
│   └── שלבים: רשימה + טיימרים
└── מד התקדמות צף
```

## רשימת משימות ליישום

- [ ] 1. תקן CSS להדפסה
- [ ] 2. הוסף fallback לשיתוף  
- [ ] 3. צור מד התקדמות צף
- [ ] 4. הסתר מחשבון תבניות ברירת מחדל
- [ ] 5. מזג טאב "מקור" לתוך "שלבים"
- [ ] 6. הוסף כפתור "סיים" בסוף המתכון
