# Firebase App Distribution Setup Instructions

## מה כבר מוגדר ✅
- `FIREBASE_APP_ID_ANDROID` - מוגדר ב-GitHub Secrets
- GitHub Actions workflow מוכן

## מה צריך להוסיף ❌
- `FIREBASE_SERVICE_ACCOUNT` - JSON של חשבון שירות Firebase

## שלבי הגדרה:

### 1. יצירת חשבון שירות ב-Firebase Console
1. עבור ל: https://console.firebase.google.com/
2. בחר בפרויקט `cook-it` (או צור חדש)
3. לחץ על ⚙️ (הגדרות) בצד שמאל > **Project settings**
4. עבור ללשונית **Service accounts**
5. לחץ על **Generate new private key**
6. שמור את הקובץ JSON - זה התוכן שצריך להוסיף לסיקרט

### 2. הוספת הסיקרט ל-GitHub
1. עבור ל: https://github.com/Arnonfr/cook-it/settings/secrets/actions
2. לחץ על **New repository secret**
3. שם: `FIREBASE_SERVICE_ACCOUNT`
4. תוכן: העתק את כל תוכן הקובץ JSON שהורדת
5. לחץ על **Add secret**

### 3. הפעלת הפצה
אחרי שהוספת את הסיקרט:
1. דחוף שינוי חדש ל-main:
   ```bash
   git add .
   git commit -m "Ready for Firebase distribution"
   git push origin main
   ```
2. GitHub Actions ירוץ אוטומטית
3. האפליקציה תופץ לבודק: arnon7700@gmail.com

## בדיקת סטטוס
ניתן לראות את הסטטוס בלשונית Actions ב-GitHub:
https://github.com/Arnonfr/cook-it/actions
