# יצירת אייקונים לאפליקציה

## אייקון נוכחי
האייקון הנוכחי הוא ברירת המחדל של Capacitor (סמל X כחול).

## איך ליצור אייקון מותאם אישית

### אפשרות 1: שימוש ב-Capacitor Assets
```bash
cd frontend
npm install -D @capacitor/assets
npx capacitor-assets generate
```

### אפשרות 2: יצירה ידנית מ-logo.svg
1. פתח את `public/logo.svg` ב-Illustrator/Figma/Sketch
2. ייצא לגדלים הבאים:
   - mipmap-mdpi: 48x48px
   - mipmap-hdpi: 72x72px
   - mipmap-xhdpi: 96x96px
   - mipmap-xxhdpi: 144x144px
   - mipmap-xxxhdpi: 192x192px
3. שמור כ-`ic_launcher.png` ו-`ic_launcher_round.png` בתיקיות המתאימות

### אפשרות 3: שימוש בכלי אונליין
1. כנס ל-https://appicon.co
2. העלה את logo.svg
3. הורד את החבילה המוכנה
4. העתק ל-`android/app/src/main/res/`

## מבנה התיקיות
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```
