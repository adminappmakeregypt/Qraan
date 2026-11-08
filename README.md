# Qraan — نظام إدارة حلقات التحفيظ (نسخة Firebase)

## الملفات (ترفع كلها على GitHub بدون فولدرات)
| الملف | الوظيفة |
|---|---|
| `firebase-config.js` | إعدادات مشروع Firebase — **الصق فيه firebaseConfig** |
| `index.html` | الدخول: المدير (بريد + كلمة مرور) / المحفظ أو المشرفة (اسم مستخدم + رقم) |
| `admin.html` + `admin.js` | لوحة المدير |
| `teacher.html` + `teacher.js` | صفحة المحفظ |
| `supervisor.html` + `supervisor.js` | **صفحة المشرفة** — تشوف المحفظين اللي تحتها وتقيّمهم وتبعت التقييم على واتساب |
| `register.html` + `register.js` | **سجل البيانات** — صفحة عامة بدون تسجيل دخول، المحفظ يكتب بياناته وبيانات طلابه |
| `core.js` | الاتصال بـ Firebase + منطق المحاضرات والمواعيد |
| `style.css` | التصميم |
| `firestore.rules` | قواعد الحماية — تُلصق في Firebase ← Firestore ← Rules |
| `functions.js` + `package.json` + `firebase.json` | كود إرسال الواتساب (Cloud Function) — يُنشر بأمر `firebase deploy` |
| `SETUP.md` | خطوات الإعداد الكاملة |

## كيف يعمل
- البيانات على **Firestore** ومتزامنة لحظيًا بين كل الأجهزة.
- المدير يرى ويعدل كل شيء. المحفظ يرى طلابه ومحاضراته فقط (محمي بـ Firestore Rules).
- حساب دخول المحفظ يُنشأ تلقائيًا عند إضافته من لوحة المدير.
- عند تسجيل آخر محاضرة في الباقة: تُضاف رسالة لولي الأمر، وترسلها Cloud Function تلقائيًا عبر WhatsApp Business API.

خطوات الإعداد الكاملة في ملف `SETUP.md`.
