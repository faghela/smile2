# 🛠️ دليل المساهمة والتطوير في متجر Smile Shop

مرحباً بك في دليل التطوير الخاص بـ **Smile Shop**! هذا المستند مخصص لمساعدتك كمطور على فهم هيكلية المشروع، وكتابة كود نظيف ومتناسق مع المعايير الحالية للموقع.

---

## 📋 جدول المحتويات
1. [إعداد بيئة التطوير](#1-إعداد-بيئة-التطوير)
2. [معايير الكود والتنسيق (Code Style)](#2-معايير-الكود-والتنسيق)
3. [إضافة ميزة جديدة للفرونت اند (Frontend)](#3-إضافة-ميزة-جديدة-للفرونت-اند)
4. [إضافة مسار أو ميزة للباك اند (Backend API)](#4-إضافة-مسار-أو-ميزة-للباك-اند)
5. [فحص وتجربة الكود](#5-فحص-وتجربة-الكود)

---

## 1. إعداد بيئة التطوير

للبدء في تطوير المشروع محلياً، اتبع الخطوات التالية:

1. **تحميل الاعتمادات**:
   ```bash
   npm install
   ```
2. **إعداد قاعدة البيانات**:
   تأكد من تشغيل خادم MongoDB محلياً على المنفذ الافتراضي `27017` أو اضبط الرابط في ملف `.env`.
3. **تشغيل سيرفر التطوير**:
   ```bash
   npm run dev
   ```
   *يعمل السيرفر باستخدام `nodemon` المدمج ليعيد التشغيل تلقائياً عند أي تعديل.*

---

## 2. معايير الكود والتنسيق

نستخدم قواعد تهيئة موحدة ومثبتة في ملف `.editorconfig`:
- **المسافات البادئة**: مسافتان (2 spaces).
- **الترميز**: UTF-8.
- **حذف الفراغات الزائدة**: يتم حذف الفراغات في نهاية السطور تلقائياً عند الحفظ.

### معايير الـ JavaScript:
- استخدام JSDoc لتوثيق جميع الدوال البرمجية (المدخلات والمخرجات ووصف الوظيفة).
- استخدام تسميات `camelCase` للمتغيرات والدوال.
- معالجة الأخطاء دائماً باستخدام `try-catch` خصوصاً في طلبات الـ fetch.

### معايير الـ CSS:
- تجنب استخدام الـ `important!` إلا للضرورة القصوى.
- تجميع شاشات التجاوب (Media Queries) في نهاية الملف.
- استخدام المتغيرات المعرفة في `:root` لإبقاء الألوان متناسقة.

---

## 3. إضافة ميزة جديدة للفرونت اند

يتكون الفرونت اند من صفحات HTML عادية وملفات JavaScript مقسمة حسب الميزة في مجلد `public/js/features/`.

### خطوات إضافة صفحة HTML جديدة:
1. أنشئ الملف في مجلد `public/` (مثال: `about.html`).
2. قم بربط ملفات الخطوط والأيقونات والتنسيقات في الـ `<head>` مع خاصية الـ `preconnect`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link rel="stylesheet" href="/css/style.css">
   ```
3. قم باستدعاء الاسكريبتات الضرورية في نهاية الـ `<body>` مع استخدام خاصية `defer` لضمان عدم حجب رندر الصفحة:
   ```html
   <script src="/js/features/globals.js" defer></script>
   <script src="/js/features/ui.js" defer></script>
   ```

### خطوات إضافة منطق برمجي (JS Feature):
1. أنشئ ملفاً جديداً في `public/js/features/` (مثال: `promo.js`).
2. وثق الدوال باستخدام JSDoc:
   ```javascript
   /**
    * يتحقق من صلاحية كود الخصم عبر الـ API
    * @param {string} code - كود الخصم المراد فحصه
    * @returns {Promise<Object>} نتيجة التحقق وقيمة الخصم
    */
   async function validatePromoCode(code) { ... }
   ```
3. استدعِ الملف في صفحة الـ HTML المناسبة قبل `main.js` مع تفعيل الـ `defer`.

---

## 4. إضافة مسار أو ميزة للباك اند (Backend API)

يتبع الباك اند نمط الـ MVC التقليدي والمقسم في مجلد `src/features/`.

عند إضافة موديل جديد (مثلاً: `Reviews` للتقييمات):
1. **إنشاء الموديل (Model)** في `src/features/reviews/review.model.js`:
   ```javascript
   const mongoose = require('mongoose');
   const reviewSchema = new mongoose.Schema({ ... });
   module.exports = mongoose.model('Review', reviewSchema);
   ```
2. **إنشاء المتحكم (Controller)** في `src/features/reviews/review.controller.js` لمعالجة الطلبات البرمجية والـ Database queries.
3. **إنشاء المسارات (Routes)** في `src/features/reviews/review.routes.js` وتصدير مسارات الـ Express.
4. **ربط الميزة في الخادم الرئيسي** `server.js`:
   ```javascript
   app.use('/api/reviews', require('./src/features/reviews/review.routes'));
   ```

---

## 5. فحص وتجربة الكود

- قبل رفع أي كود للمستودع، تأكد من تشغيل الاختبارات للتأكد من عدم كسر أي من الميزات القائمة:
  ```bash
  npm test
  ```
- تأكد من عدم وجود أخطاء في الـ Console الخاص بالمتصفح أثناء التصفح المحلي.
