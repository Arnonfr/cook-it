// App version - update this with each release
export const APP_VERSION = {
  version: '1.0.3',
  buildDate: '2025-03-22',
  changelog: [
    'שיפור אבטחה: הגנת Rate Limiting ו-Helmet',
    'שיפור חילוץ שלבי מתכון - פיצול אגרסיבי לטקסט ארוך',
    'תיקון תצוגת מרכיבים בתוצאות חיפוש',
    'תיקון הגדרות פרופיל ושמירת העדפות',
  ],
};

export const getVersionString = () => {
  return `v${APP_VERSION.version}`;
};
