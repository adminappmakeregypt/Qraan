/* ===================== Qraan — إرسال واتساب تلقائي =====================
   يعمل على سيرفر Firebase (الملف: functions.js): أي رسالة جديدة في outbox حالتها pending
   تُرسل لولي الأمر كقالب معتمد عبر WhatsApp Cloud API:
   - eval   ← قالب تقييم الحصة (5 متغيرات)
   - renew  ← قالب انتهاء الباقة
   التوكن و Phone Number ID محفوظين كـ Secrets (لا يراها أحد من المتصفح).
======================================================================= */
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

// ⚠️ لازم تكون نفس منطقة قاعدة Firestore (اخترنا europe-west1 عند إنشاء القاعدة)
const REGION = 'europe-west1';
const WA_TOKEN = defineSecret('WA_TOKEN');
const WA_PHONE_ID = defineSecret('WA_PHONE_ID');
const opts = { region: REGION, secrets: [WA_TOKEN, WA_PHONE_ID] };

async function send(ref, m) {
  const s = (await getFirestore().doc('qraan_settings/main').get()).data() || {};
  if (s.waMode !== 'api') return;                       // الإرسال اليدوي مفعّل
  const fail = error => ref.update({ error, lastTry: Date.now() });
  if (!m.phone) return fail('رقم ولي الأمر غير مسجل');
  // تقييم الحصة له قالب خاص بمتغيرات — انتهاء الباقة ورسالة الاختبار بالقالب الأساسي
  const template = m.kind === 'eval' ? s.waEvalTemplate : s.waTemplate;
  if (!template) return fail(m.kind === 'eval' ? 'اسم قالب التقييم غير محدد في الإعدادات' : 'اسم القالب غير محدد في الإعدادات');
  const tpl = { name: template, language: { code: s.waLang || 'ar' } };
  if (Array.isArray(m.params) && m.params.length)
    tpl.components = [{ type: 'body', parameters: m.params.map(t => ({ type: 'text', text: String(t || '—').slice(0, 1000) })) }];

  const url = `https://graph.facebook.com/${s.waVersion || 'v21.0'}/${WA_PHONE_ID.value()}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_TOKEN.value()}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: m.phone, type: 'template',
        template: tpl,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error?.message || `HTTP ${res.status}`);
    await ref.update({ status: 'sent', via: 'api', sentAt: Date.now(), waId: body?.messages?.[0]?.id || '', error: FieldValue.delete() });
    logger.info('sent', { to: m.phone, id: ref.id });
  } catch (e) {
    logger.error('send failed', { to: m.phone, id: ref.id, error: e.message });
    await fail(e.message);
  }
}

// رسالة جديدة (آخر محاضرة في الباقة / رسالة اختبار)
exports.waOnCreate = onDocumentCreated({ document: 'qraan_outbox/{id}', ...opts }, async event => {
  const snap = event.data;
  if (!snap) return;
  const m = snap.data();
  if (m.status === 'pending') await send(snap.ref, m);
});

// إعادة المحاولة من لوحة المدير
exports.waOnRetry = onDocumentUpdated({ document: 'qraan_outbox/{id}', ...opts }, async event => {
  const before = event.data.before.data(), after = event.data.after.data();
  if (after.status === 'pending' && after.retryAt && after.retryAt !== before.retryAt) await send(event.data.after.ref, after);
});
