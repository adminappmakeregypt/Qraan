# Qraan — خطوات ربط Firebase

## المرحلة 1: تشغيل التطبيق على Firebase (مجاني — بدون واتساب)

### 1) إنشاء المشروع
1. ادخل https://console.firebase.google.com ← **Add project** ← اسم: `qraan`.
2. **Build ← Firestore Database ← Create database**
   - Location: **europe-west1 (Belgium)** ← مهم، نفس المنطقة في `functions.js`
   - اختار **Production mode**.
3. **Build ← Authentication ← Get started ← Sign-in method ← Email/Password ← Enable**.
4. **Authentication ← Settings ← Authorized domains ← Add domain**:
   `adminappmakeregypt.github.io`

### 2) ربط ملفات الموقع
1. **Project settings (⚙️) ← General ← Your apps ← Web (`</>`)** ← سجّل التطبيق.
2. انسخ قيم `firebaseConfig` والصقها في ملف **firebase-config.js**.
3. ارفع كل الملفات على GitHub مكان القديمة (كلها في مكان واحد، من غير فولدرات).

### 3) قواعد الحماية
**Firestore Database ← Rules** ← امسح الموجود والصق محتوى ملف `firestore.rules` ← **Publish**.

### 4) أول تشغيل
1. افتح `https://adminappmakeregypt.github.io/Qraan/` **من نفس المتصفح اللي فيه البيانات القديمة**.
2. هتظهر صفحة «أنشئ حساب المدير» ← سجّل بإيميلك وكلمة مرور.
3. **الإعدادات ← البيانات ← «نقلها إلى Firebase»** ← هينقل المحفظين والطلاب والمحاضرات، ويعمل حسابات دخول المحفظين بنفس اسم المستخدم والرقم.

> ⚠️ اعمل خطوة «أنشئ حساب المدير» فورًا بعد نشر القواعد — أول حساب يتسجل هو المدير.

---

## المرحلة 2: الإرسال التلقائي لواتساب (يحتاج باقة Blaze)

### المطلوب قبل البدء
- **قالبين Utility** معتمدين من Meta (اللغة: Arabic):

**1) `subscription_renewal` — انتهاء الباقة (بدون متغيرات):**
```
السلام عليكم
معكم أكاديمية الصفوة لتحفيظ القرآن الكريم.
نذكركم أن اليوم كانت آخر محاضرة في الباقة الحالية.
برجاء دفع قيمة الاشتراك الجديد.
للاستفسار والدفع تواصلوا معنا على: 01xxxxxxxxx
```

**2) `session_evaluation` — تقييم الحصة (5 متغيرات بنفس الترتيب):**
```
السلام عليكم
معكم أكاديمية الصفوة لتحفيظ القرآن الكريم.
تقييم الطالب/ة {{1}} في حلقة يوم {{2}}: {{3}}
ملاحظات المحفظ: {{4}}
المحاضرات المتبقية في الباقة: {{5}}
جزاكم الله خيرًا
```
أمثلة للمتغيرات عند التقديم (Meta بتطلبها): `عمر محمد` · `2026-11-08` · `ممتاز` · `حفظ سورة النبأ` · `5`
- **Permanent Access Token** (System User) و **Phone Number ID**.
- وسيلة دفع في WhatsApp Manager.
- Firebase ← **Upgrade ← Blaze** (Cloud Functions لا تعمل على الباقة المجانية).

### النشر (مرة واحدة من اللابتوب)
1. نزّل **Node.js LTS** من https://nodejs.org وثبّته.
2. افتح فولدر الملفات اللي نزّلته (نفس ملفات الموقع) ← اضغط في شريط العنوان واكتب `powershell` ← Enter.
3. نفّذ الأوامر بالترتيب:
```
npm install -g firebase-tools
firebase login
firebase use --add
npm install
firebase functions:secrets:set WA_TOKEN
firebase functions:secrets:set WA_PHONE_ID
firebase deploy --only firestore:rules,functions
```
- `firebase use --add` ← اختار مشروع qraan واكتب أي اسم مختصر (مثلًا `default`).
- أوامر `secrets:set` هتطلب منك تلصق القيمة (التوكن، ثم Phone Number ID).

### التفعيل
**لوحة المدير ← الإعدادات ← ربط واتساب**:
1. اكتب **اسمي القالبين** (انتهاء الباقة + تقييم الحصة) ← اختار **تلقائي** ← حفظ.
2. اكتب رقمك ← **إرسال رسالة اختبار** ← تابع النتيجة في «رسائل واتساب».

## لو حصلت مشكلة
| المشكلة | الحل |
|---|---|
| «هذا الموقع غير مضاف في Firebase» | أضف الدومين في Authentication ← Authorized domains |
| «لا توجد صلاحية» عند الحفظ | تأكد إنك نشرت `firestore.rules` |
| الرسالة فضلت «جارٍ الإرسال» | Firebase ← Functions ← Logs. تأكد إن `waOnCreate` منشورة وإن الباقة Blaze |
| خطأ من Meta في «رسائل واتساب» | راجع اسم القالب واللغة (`ar`) وصلاحية التوكن |
| خطأ «number of parameters» في رسالة التقييم | قالب التقييم لازم يكون فيه 5 متغيرات بالظبط بنفس الترتيب |
| منطقة Firestore غير europe-west1 | غيّر `REGION` في `functions.js` لنفس المنطقة ثم انشر تاني |
| بعد `npm install` ظهر فولدر `node_modules` | ده طبيعي على اللابتوب — **ما ترفعوش على GitHub** |
