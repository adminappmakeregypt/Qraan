/* ===================== Qraan — النواة المشتركة ===================== */
'use strict';

const OLD_LOCAL_KEY = 'qraan_db_v1'; // بيانات النسخة القديمة المحفوظة في المتصفح (للنقل فقط)

const COUNTRIES = {
  EG: { name: 'مصر',      tz: 'Africa/Cairo', code: '20',  flag: '🇪🇬' },
  SA: { name: 'السعودية', tz: 'Asia/Riyadh',  code: '966', flag: '🇸🇦' },
  KW: { name: 'الكويت',   tz: 'Asia/Kuwait',  code: '965', flag: '🇰🇼' },
  AE: { name: 'الإمارات', tz: 'Asia/Dubai',   code: '971', flag: '🇦🇪' },
  JO: { name: 'الأردن',   tz: 'Asia/Amman',   code: '962', flag: '🇯🇴' },
};
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const GRADES = ['ممتاز', 'جيد جدًا', 'جيد', 'يحتاج متابعة'];
const ATT = { present: 'حضر', absent: 'لم يحضر', excused: 'غائب بعذر' };
const STATUS = { paid: 'مدفوع', expired: 'منتهي' };

const defaultSettings = () => ({
  academy: 'أكاديمية Qraan',
  whatsapp: '', adminCountry: 'EG',
  defaultLectures: 8,
  absentCounts: true,            // هل الغياب يخصم محاضرة من الباقة؟
  // ===== رسالة واتساب الوحيدة: عند انتهاء الباقة =====
  tplEnd:
`السلام عليكم
نذكركم أن اليوم كانت آخر محاضرة تحفيظ قرآن.
برجاء دفع قيمة الاشتراك الجديد.`,
  // ===== رسالة تقييم الحصة (بعد «حضر») =====
  sendEval: true,
  tplEval:
`السلام عليكم
معكم أكاديمية الصفوة لتحفيظ القرآن الكريم.
تقييم الطالب/ة {student} في حلقة يوم {date}: {grade}
ملاحظات المحفظ: {notes}
المحاضرات المتبقية في الباقة: {remaining}
جزاكم الله خيرًا`,
  waEvalTemplate: '',            // اسم قالب التقييم المعتمد من Meta (به 5 متغيرات)
  waMode: 'manual',              // manual = زر واتساب يدوي | api = إرسال تلقائي عبر WhatsApp Business API
  waVersion: 'v21.0',
  waTemplate: '', waLang: 'ar',  // اسم القالب المعتمد من Meta ولغته (التوكن محفوظ في Cloud Functions وليس هنا)
  tplSession:
`السلام عليكم ورحمة الله وبركاته
ولي أمر الطالب/ة: {student}
حلقة يوم {dayname} {date} الساعة {time}
• الحضور: {attendance}
المحاضرات المتبقية في الباقة: {remaining} من {total}
المحفظ: {teacher}
{academy}`,
  tplReport:
`السلام عليكم ورحمة الله وبركاته
ولي أمر الطالب/ة: {student}
تقرير حلقة يوم {date}
• الحضور: {attendance}
• الحفظ الجديد: {memorized}
• المراجعة: {review}
• التقييم: {grade}
• ملاحظات المحفظ: {notes}
المحاضرات المتبقية في الباقة: {remaining} من {total}
المحفظ: {teacher}
{academy}`,
  tplExtra:
`السلام عليكم ورحمة الله وبركاته
ولي أمر الطالب/ة: {student}
تمت إضافة حلقة إضافية يوم {dayname} {date} الساعة {time} (بتوقيت {country}) مع المحفظ/ة {teacher}.
{academy}`,
  tplRenew:
`السلام عليكم ورحمة الله وبركاته
ولي أمر الطالب/ة: {student}
نحيطكم علمًا بأن حلقة اليوم كانت آخر محاضرة في الباقة الحالية ({total} محاضرة).
نرجو التكرم بسداد قيمة الاشتراك لاستمرار الحلقات في مواعيدها.
جزاكم الله خيرًا
{academy}`,
  tplSchedule:
`السلام عليكم ورحمة الله وبركاته
ولي أمر الطالب/ة: {student}
مواعيد حلقات التحفيظ مع المحفظ/ة {teacher}
(بتوقيت {country}):
{schedule}
{academy}`,
});

const defaultDB = () => ({ settings: defaultSettings(), teachers: [], students: [], reports: [], outbox: [] });

/* ---------- Firebase ---------- */
/** كل جداول Qraan تبدأ بـ qraan_ علشان ماتتلخبطش مع أي بيانات قديمة في نفس المشروع */
const P = name => 'qraan_' + name;
const FB = { app: null, auth: null, fs: null };
function fbConfigured() { return !!(window.FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && !String(FIREBASE_CONFIG.apiKey).startsWith('PASTE')); }
function fbInit() {
  if (FB.app) return FB;
  if (!window.firebase) throw new Error('تعذر تحميل Firebase — تأكد من الاتصال بالإنترنت');
  if (!fbConfigured()) throw new Error('config');
  FB.app = firebase.apps.find(a => a.name === '[DEFAULT]') || firebase.initializeApp(FIREBASE_CONFIG);
  FB.auth = firebase.auth(); FB.fs = firebase.firestore();
  return FB;
}
function configMissingScreen() {
  document.body.innerHTML = `<div class="auth-wrap"><div class="auth-card"><div class="logo"><div class="mark">ق</div><div class="brand">Qraan</div></div>
    <div class="note">لم يتم ربط Firebase بعد.<br>افتح ملف <b>firebase-config.js</b> والصق فيه إعدادات مشروعك من Firebase Console.</div></div></div>`;
}

/** حسابات المحفظين: اسم المستخدم + الرقم ← بريد وكلمة مرور داخلية في Firebase Auth */
async function teacherEmail(username) { return 't' + (await sha256(String(username).trim().toLowerCase())).slice(0, 40) + '@teachers.qraan.app'; }
const teacherPass = code => 'qraan#' + String(code).trim();
function secondaryAuth() {
  const app = firebase.apps.find(a => a.name === 'qraan-sec') || firebase.initializeApp(FIREBASE_CONFIG, 'qraan-sec');
  return app.auth();
}
/** إنشاء/تحديث حساب دخول المحفظ (يتم من جهاز المدير دون تسجيل خروجه) */
async function ensureTeacherAuth(t, oldCode) {
  const a = secondaryAuth(), email = await teacherEmail(t.username);
  try {
    if (!t.uid) {
      try { t.uid = (await a.createUserWithEmailAndPassword(email, teacherPass(t.code))).user.uid; }
      catch (e) {
        if (e.code !== 'auth/email-already-in-use') throw e;
        const c = await a.signInWithEmailAndPassword(email, teacherPass(oldCode || t.code));
        t.uid = c.user.uid;
        if (oldCode && oldCode !== t.code) await c.user.updatePassword(teacherPass(t.code));
      }
    } else if (oldCode && oldCode !== t.code) {
      const c = await a.signInWithEmailAndPassword(email, teacherPass(oldCode));
      await c.user.updatePassword(teacherPass(t.code));
    }
  } finally { try { await a.signOut(); } catch (e) { } }
}
async function deleteTeacherAuth(t) {
  const a = secondaryAuth();
  try { const c = await a.signInWithEmailAndPassword(await teacherEmail(t.username), teacherPass(t.code)); await c.user.delete(); }
  catch (e) { console.warn('delete auth', e); } finally { try { await a.signOut(); } catch (e) { } }
}

/* ---------- التخزين (Firestore مع مزامنة لحظية) ---------- */
const stable = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)) ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x);
const COLLS = ['teachers', 'students', 'reports', 'outbox', 'intake', 'supervisors', 'teacherEvals'];
const Store = {
  db: { settings: defaultSettings(), teachers: [], students: [], reports: [], outbox: [], intake: [], supervisors: [], teacherEvals: [] },
  _last: { teachers: {}, students: {}, reports: {}, outbox: {}, intake: {}, supervisors: {}, teacherEvals: {}, settings: '' },
  role: null, uid: null, onChange: null, _subs: [],
  load() { return this.db; },
  teacher(id) { return this.db.teachers.find(t => t.id === id); },
  student(id) { return this.db.students.find(s => s.id === id); },
  supervisor(id) { return this.db.supervisors.find(s => s.id === id); },

  /** بدء الاستماع للبيانات حسب الدور — المدير يرى كل شيء، المحفظ يرى بياناته فقط */
  start(role, uid) {
    this.role = role; this.uid = uid;
    const fs = FB.fs;
    const col = c => fs.collection(P(c));
    const qs = role === 'admin'
      ? Object.fromEntries(COLLS.map(c => [c, col(c)]))
      : role === 'supervisor'   // المشرفة: المحفظين اللي تحتها وطلابهم ومحاضراتهم + تقييماتها
        ? { supervisors: col('supervisors').where('uid', '==', uid), teachers: col('teachers').where('supervisorUid', '==', uid),
            students: col('students').where('supervisorUid', '==', uid), reports: col('reports').where('supervisorUid', '==', uid),
            teacherEvals: col('teacherEvals').where('supervisorUid', '==', uid) }
        : { teachers: col('teachers').where('uid', '==', uid), students: col('students').where('teacherUid', '==', uid), reports: col('reports').where('teacherUid', '==', uid) };
    const listen = (ref, onData) => new Promise((res, rej) => {
      let first = true;
      this._subs.push(ref.onSnapshot(snap => { onData(snap); if (first) { first = false; res(); } else this._changed(); },
        err => { console.error(err); if (first) { first = false; rej(err); } else toast('انقطع الاتصال بقاعدة البيانات', true); }));
    });
    const waits = Object.entries(qs).map(([c, q]) => listen(q, snap => {
      this.db[c] = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      this._last[c] = Object.fromEntries(this.db[c].map(x => [x.id, stable(x)]));
    }));
    waits.push(listen(fs.doc(P('settings') + '/main'), d => {
      Object.assign(this.db.settings, defaultSettings(), d.data() || {});
      this._last.settings = stable(this.db.settings);
    }));
    return Promise.all(waits);
  },
  _changed() {
    clearTimeout(this._ct);
    this._ct = setTimeout(() => {
      const a = document.activeElement;
      if ($('#modal') || (a && a.closest && a.closest('#main') && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) return; // لا نقاطع المستخدم أثناء الكتابة
      this.onChange && this.onChange();
    }, 150);
  },

  /** حفظ التغييرات فقط (diff) في Firestore */
  save() {
    if (!this.role) return Promise.resolve();
    const fs = FB.fs, main = [], ob = [];
    const tUid = id => this.db.teachers.find(t => t.id === id)?.uid || '';
    if (this.role === 'admin') {
      // ربط المحفظ بالمشرفة، ونسخ معرّف المشرفة على طلابه ومحاضراته (علشان تقدر تشوفهم)
      this.db.teachers.forEach(t => { const s = this.supervisor(t.supervisorId); t.supervisorUid = s?.uid || ''; if (s) t.supervisor = s.name; });
      const sUid = id => this.teacher(id)?.supervisorUid || '';
      this.db.students.forEach(s => { s.teacherUid = tUid(s.teacherId); s.supervisorUid = sUid(s.teacherId); });
      this.db.reports.forEach(r => { if (!r.teacherUid) r.teacherUid = tUid(r.teacherId); r.supervisorUid = sUid(r.teacherId); });
    } else if (this.role === 'teacher') {
      const sup = this.db.teachers[0]?.supervisorUid || '';
      this.db.reports.forEach(r => { if (!r.teacherUid) r.teacherUid = this.uid; if (!('supervisorUid' in r)) r.supervisorUid = sup; });
    }
    this.db.outbox.forEach(m => { if (!m.createdBy) m.createdBy = this.uid; });
    const colls = this.role === 'admin' ? COLLS : this.role === 'supervisor' ? ['teacherEvals'] : ['students', 'reports', 'outbox'];
    for (const c of colls) {
      const next = {};
      for (const item of this.db[c]) {
        if (!item.id) item.id = uid();
        const str = stable(item); next[item.id] = str;
        if (this._last[c][item.id] !== str) (c === 'outbox' ? ob : main).push(['set', fs.collection(P(c)).doc(item.id), JSON.parse(str)]);
      }
      for (const id of Object.keys(this._last[c])) if (!(id in next)) (c === 'outbox' ? ob : main).push(['del', fs.collection(P(c)).doc(id)]);
      this._last[c] = next;
    }
    if (this.role === 'admin') {
      const st = stable(this.db.settings);
      if (st !== this._last.settings) { main.push(['set', fs.doc(P('settings') + '/main'), JSON.parse(st)]); this._last.settings = st; }
    }
    const commit = async ops => {
      for (let i = 0; i < ops.length; i += 450) {
        const b = fs.batch();
        ops.slice(i, i + 450).forEach(([t, ref, data]) => t === 'set' ? b.set(ref, data) : b.delete(ref));
        await b.commit();
      }
    };
    return commit(main).then(() => commit(ob).catch(e => console.warn('outbox', e)))
      .catch(e => { console.error(e); toast('تعذر الحفظ: ' + (e.code === 'permission-denied' ? 'لا توجد صلاحية' : e.message), true); });
  },
};

/** تشغيل الصفحة بعد التأكد من تسجيل الدخول وتحميل البيانات */
function boot(role) {
  return new Promise(resolve => {
    let F;
    try { F = fbInit(); } catch (e) { if (e.message === 'config') configMissingScreen(); else alert(e.message); return; }
    let started = false;
    F.auth.onAuthStateChanged(async u => {
      if (!u) { location.href = 'index.html'; return; }
      if (started) return; started = true;
      try {
        if (role === 'admin' && !(await F.fs.doc(P('admins') + '/' + u.uid).get()).exists) throw new Error('not admin');
        await Store.start(role, u.uid);
        if (role === 'teacher') { const t = Store.db.teachers[0]; if (!t || t.active === false) throw new Error('inactive'); }
        if (role === 'supervisor') { const s = Store.db.supervisors[0]; if (!s || s.active === false) throw new Error('inactive'); }
        resolve(u);
      } catch (e) { console.error(e); try { await F.auth.signOut(); } catch (x) { } location.href = 'index.html'; }
    });
  });
}
function logout() { (FB.auth ? FB.auth.signOut() : Promise.resolve()).finally(() => { location.href = 'index.html'; }); }

/* ---------- أدوات عامة ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fill = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? '') === '' ? '—' : v[k]);
const countryLabel = c => COUNTRIES[c] ? `${COUNTRIES[c].flag} ${COUNTRIES[c].name}` : '—';
const countryOptions = sel => Object.entries(COUNTRIES).map(([k, c]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('');
const fmtDate = ts => new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtDateTime = ts => new Date(ts).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function toast(msg, isErr = false) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'show' + (isErr ? ' err' : '');
  clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 2600);
}

/* ---------- النافذة المنبثقة ---------- */
function openModal(title, body, footer = '') {
  closeModal();
  const back = document.createElement('div');
  back.className = 'modal-back'; back.id = 'modal';
  back.innerHTML = `<div class="modal" role="dialog"><header><h3>${title}</h3><button class="x" onclick="closeModal()">×</button></header>
    <div class="body">${body}</div>${footer ? `<div class="foot">${footer}</div>` : ''}</div>`;
  back.addEventListener('mousedown', e => { if (e.target === back) closeModal(); });
  document.body.appendChild(back);
  return back;
}
function closeModal() { $('#modal')?.remove(); }
function confirmBox(text) { return window.confirm(text); }

/* ---------- واتساب ---------- */
function normPhone(p, country) {
  let d = String(p || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  const cc = (COUNTRIES[country] || COUNTRIES.EG).code;
  if (d.startsWith(cc) && d.length > 9) return d;
  if (d.startsWith('0')) d = d.slice(1);
  return cc + d;
}
const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

/* ---------- المناطق الزمنية والمواعيد ---------- */
const WEEK = 10080; // دقائق الأسبوع
const tzOf = c => (COUNTRIES[c] || COUNTRIES.EG).tz;

function tzOffset(tz, date = new Date()) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    .formatToParts(date).forEach(x => p[x.type] = x.value);
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}
function nowIn(country) {
  const d = new Date(), local = new Date(d.getTime() + tzOffset(tzOf(country), d) * 60000);
  return { day: local.getUTCDay(), min: local.getUTCHours() * 60 + local.getUTCMinutes(), iso: local.toISOString().slice(0, 10) };
}
const slotMin = s => { const [h, m] = s.time.split(':').map(Number); return s.day * 1440 + h * 60 + m; };
function convertSlot(s, fromCountry, toCountry) {
  const a = tzOf(fromCountry), b = tzOf(toCountry);
  if (a === b) return { ...s };
  let m = slotMin(s) - tzOffset(a) + tzOffset(b);
  m = ((m % WEEK) + WEEK) % WEEK;
  return { ...s, day: Math.floor(m / 1440), time: pad(Math.floor((m % 1440) / 60)) + ':' + pad(m % 60) };
}
function fmtTime(t) { let [h, m] = t.split(':').map(Number); const s = h < 12 ? 'ص' : 'م'; h = h % 12 || 12; return `${h}:${pad(m)} ${s}`; }
const fmtSlot = s => `${DAYS[s.day]} ${fmtTime(s.time)}`;
/** مواعيد الطالب (المخزنة بتوقيت بلد الطالب) محولة لتوقيت بلد آخر */
const slotsIn = (st, country) => (st.slots || []).map(s => convertSlot(s, st.country, country)).sort((a, b) => slotMin(a) - slotMin(b));
const isActive = st => st.status === 'paid' && st.remaining > 0;

function nextSession(st, country) {
  if (!isActive(st) || !st.slots?.length) return null;
  const n = nowIn(country), now = n.day * 1440 + n.min;
  let best = null;
  for (const s of slotsIn(st, country)) {
    let d = slotMin(s) - now; if (d < -60) d += WEEK; // تظهر الحلقة الجارية لمدة ساعة
    if (!best || d < best.d) best = { ...s, d };
  }
  return best;
}
function inText(min) {
  if (min <= 0) return 'الآن';
  if (min < 60) return `بعد ${min} دقيقة`;
  if (min < 1440) return `بعد ${Math.floor(min / 60)} ساعة`;
  return `بعد ${Math.floor(min / 1440)} يوم`;
}

/* ---------- منطق الأعمال ---------- */
function msgVars(st, extra = {}) {
  const t = Store.teacher(st.teacherId);
  return {
    student: st.name, parent: st.parentName, teacher: t?.name || '', academy: Store.db.settings.academy,
    remaining: st.remaining, total: st.total, country: COUNTRIES[st.country]?.name || '', ...extra,
  };
}

function queueMessage(kind, st, text, params) {
  const m = {
    id: uid(), kind, studentId: st.id, studentName: st.name, teacherId: st.teacherId,
    phone: normPhone(st.parentPhone, st.country), text, createdAt: Date.now(), status: 'pending',
  };
  if (params) m.params = params.map(x => String(x ?? '').trim() || '—');   // متغيرات قالب Meta بالترتيب
  Store.db.outbox.push(m);
  return m;
}

/* ---------- جلسات الجدول ---------- */
function localOf(ts, country) {
  const d = new Date(ts + tzOffset(tzOf(country), new Date(ts)) * 60000);
  return { iso: d.toISOString().slice(0, 10), day: d.getUTCDay(), time: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()), month: d.toISOString().slice(0, 7) };
}
function addDaysIso(iso, k) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); }
function occTs(iso, time, country) {
  const [y, m, d] = iso.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  return guess - tzOffset(tzOf(country), new Date(guess)) * 60000;
}
const lastRenewal = st => Math.max(0, ...(st.renewals || []).map(r => r.date));
const fmtDayDate = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** محاضرات المحفظ (المسجلة + المطلوبة) من الجدول الذي حدده المدير، بتوقيت بلد المحفظ */
function teacherSessions(teacherId, country, pastDays = 7, nextDays = 7) {
  const n = nowIn(country), out = [];
  const recorded = new Map(Store.db.reports.filter(r => r.teacherId === teacherId && r.slotKey).map(r => [r.slotKey, r]));
  Store.db.students.filter(s => s.teacherId === teacherId).forEach(st => {
    const slots = slotsIn(st, country);
    if (!slots.length && !(st.extra || []).length) return;
    const since = Math.max(st.createdAt || 0, st.slotsAt || 0, lastRenewal(st));
    const list = [];
    for (let k = -pastDays; k <= nextDays; k++) {
      const day = ((n.day + k) % 7 + 7) % 7, iso = addDaysIso(n.iso, k);
      slots.filter(s => s.day === day).forEach(s => {
        const ts = occTs(iso, s.time, country), key = st.id + '@' + ts, rec = recorded.get(key);
        if (!rec && ts < Math.max(since, s.since || 0)) return;
        list.push({ st, date: iso, day, time: s.time, ts, key, rec });
      });
    }
    const from = occTs(addDaysIso(n.iso, -pastDays), '00:00', country), to = occTs(addDaysIso(n.iso, nextDays + 1), '00:00', country);
    (st.extra || []).filter(e => e.ts >= from && e.ts < to).forEach(e => {
      const l = localOf(e.ts, country), key = st.id + '@' + e.ts;
      if (list.some(o => o.key === key)) return;
      list.push({ st, date: l.iso, day: l.day, time: l.time, ts: e.ts, key, rec: recorded.get(key), extra: true });
    });
    let left = isActive(st) ? st.remaining : 0;   // لا تظهر محاضرات أكثر من رصيد الباقة
    list.sort((a, b) => a.ts - b.ts).forEach(o => { if (o.rec) out.push(o); else if (left > 0) { left--; out.push(o); } });
  });
  return out.sort((a, b) => a.ts - b.ts);
}

function recordSession(st, teacher, occ, attendance, extra = {}) {
  const S = Store.db.settings;
  if (!isActive(st)) throw new Error('اشتراك الطالب منتهي — لا توجد محاضرات قبل التجديد');
  if (Store.db.reports.some(r => r.slotKey === occ.key)) throw new Error('تم تسجيل هذه المحاضرة من قبل');
  const counted = attendance === 'present' || S.absentCounts;
  const lectureNo = st.total - st.remaining + 1;
  const wasStatus = st.status;
  if (counted) st.remaining = Math.max(0, st.remaining - 1);
  if (attendance === 'present') st.attended = (st.attended || 0) + 1; else st.absent = (st.absent || 0) + 1;

  const rep = {
    id: uid(), studentId: st.id, teacherId: teacher.id, createdAt: Date.now(), slotKey: occ.key, sessionTs: occ.ts,
    date: occ.date, time: occ.time, attendance, counted, lectureNo, remainingAfter: st.remaining, wasStatus, msgIds: [],
  };
  if (attendance === 'present' && extra.grade) { rep.grade = extra.grade; rep.notes = (extra.notes || '').trim(); }
  Store.db.reports.push(rep);

  const msgs = [];
  if (rep.grade && S.sendEval) {   // رسالة تقييم الحصة لولي الأمر
    const loc = localOf(occ.ts, st.country);
    const v = msgVars(st, { date: loc.iso, grade: rep.grade, notes: rep.notes || '—' });
    msgs.push(queueMessage('eval', st, fill(S.tplEval, v), [st.name, loc.iso, rep.grade, rep.notes, st.remaining]));
  }
  if (st.remaining <= 0) {   // آخر محاضرة في الباقة → رسالة واحدة لولي الأمر
    st.status = 'expired'; st.expiredAt = Date.now();
    msgs.push(queueMessage('renew', st, fill(S.tplEnd, msgVars(st))));
  }
  rep.msgIds = msgs.map(m => m.id); rep.msgId = msgs[0]?.id || null;
  Store.save();
  return { rep, msgs };
}

/** إلغاء تسجيل محاضرة (تصحيح خطأ) — يرجع الرصيد ويحذف الرسائل التي لم تُرسل */
function undoSession(repId) {
  const db = Store.db, r = db.reports.find(x => x.id === repId);
  if (!r) return;
  const st = Store.student(r.studentId);
  if (st) {
    if (r.counted) st.remaining = Math.min(st.total, st.remaining + 1);
    if (r.attendance === 'present') st.attended = Math.max(0, (st.attended || 0) - 1);
    else if (r.attendance === 'absent') st.absent = Math.max(0, (st.absent || 0) - 1);
    else st.excused = Math.max(0, (st.excused || 0) - 1);
    if (st.remaining > 0 && st.status === 'expired' && r.wasStatus === 'paid') st.status = 'paid';
  }
  const ids = r.msgIds || (r.msgId ? [r.msgId] : []);
  db.outbox = db.outbox.filter(m => !(ids.includes(m.id) && m.status === 'pending'));
  db.reports = db.reports.filter(x => x.id !== repId);
  Store.save();
}

/** تعديل حضور محاضرة مسجلة (من المدير) */
function editSession(repId, att) {
  const S = Store.db.settings, r = Store.db.reports.find(x => x.id === repId);
  if (!r || r.attendance === att) return;
  const st = Store.student(r.studentId), counted = att === 'present' || S.absentCounts;
  if (st) {
    if (r.attendance === 'present') st.attended = Math.max(0, (st.attended || 0) - 1); else st.absent = Math.max(0, (st.absent || 0) - 1);
    if (att === 'present') st.attended = (st.attended || 0) + 1; else st.absent = (st.absent || 0) + 1;
    if (r.counted && !counted) st.remaining = Math.min(st.total, st.remaining + 1);
    if (!r.counted && counted) st.remaining = Math.max(0, st.remaining - 1);
    if (st.remaining <= 0) st.status = 'expired';
    else if (st.status === 'expired' && r.wasStatus === 'paid') st.status = 'paid';
    r.remainingAfter = st.remaining;
  }
  const m = Store.db.outbox.find(x => x.id === r.msgId && x.status === 'pending');
  r.attendance = att; r.counted = counted; r.editedAt = Date.now();
  Store.save();
}

/** إحصائيات محاضرات محفظ */
function teacherStats(teacherId, country) {
  const month = nowIn(country).iso.slice(0, 7);
  const reps = Store.db.reports.filter(r => r.teacherId === teacherId);
  const inMonth = reps.filter(r => (r.sessionTs ? localOf(r.sessionTs, country).month : String(r.date).slice(0, 7)) === month);
  return {
    total: reps.length, month: inMonth.length,
    present: reps.filter(r => r.attendance === 'present').length, absent: reps.filter(r => r.attendance !== 'present').length,
    monthPresent: inMonth.filter(r => r.attendance === 'present').length,
  };
}
/** وقت المحاضرة المسجلة بتوقيت بلد معين */
function repWhen(r, country) {
  if (r.sessionTs) { const l = localOf(r.sessionTs, country); return { iso: l.iso, time: l.time }; }
  return { iso: r.date, time: '' };
}

/** إضافة محاضرات لرصيد الباقة الحالية (بدون تصفير) */
function topUpStudent(st, n) {
  n = Math.max(1, parseInt(n, 10) || 0);
  st.total += n; st.remaining += n;
  if (st.status === 'expired' && st.remaining > 0) st.status = 'paid';
  (st.renewals ||= []).push({ date: Date.now(), lectures: n, topup: true });
  Store.save();
}
/** تعارض موعد مع حلقات المحفظ الأخرى (دقائق الأسبوع بتوقيت المحفظ) */
function slotConflicts(teacherId, slot, slotCountry, dur, exceptStudentId) {
  const t = Store.teacher(teacherId); if (!t) return [];
  const m = slotMin(convertSlot(slot, slotCountry, t.country)), out = [];
  Store.db.students.filter(s => s.teacherId === teacherId && isActive(s)).forEach(st => {
    slotsIn(st, t.country).forEach(x => {
      const a = slotMin(x), d2 = st.duration || 30;
      const overlap = [0, WEEK, -WEEK].some(k => m < a + k + d2 && a + k < m + dur);
      if (overlap && st.id !== exceptStudentId) out.push(`${st.name} (${fmtSlot(x)})`);
    });
  });
  return out;
}

function renewStudent(st, lectures) {
  lectures = Math.max(1, parseInt(lectures, 10) || 0);
  st.total = lectures;
  st.remaining = (st.remaining > 0 ? st.remaining : 0) + lectures;
  st.status = 'paid';
  (st.renewals ||= []).push({ date: Date.now(), lectures });
  Store.save();
}

function scheduleText(st, country = st.country) {
  return slotsIn(st, country).map(s => `• ${fmtSlot(s)}`).join('\n') || '—';
}
function queueSchedule(st) {
  const S = Store.db.settings;
  const m = queueMessage('schedule', st, fill(S.tplSchedule, msgVars(st, { schedule: scheduleText(st) })));
  Store.save();
  return m;
}

/** الإرسال التلقائي يتم على سيرفر Firebase (Cloud Function) فور إضافة الرسالة — هنا نُرجع الحالة فقط */
async function deliver(m) { return Store.db.settings.waMode === 'api' ? 'queued' : 'manual'; }
/** إعادة محاولة الإرسال التلقائي (تُشغّل الـ Cloud Function مرة أخرى) */
function retrySend(m) { m.status = 'pending'; m.retryAt = Date.now(); delete m.error; Store.save(); }

function markSent(id) {
  const m = Store.db.outbox.find(x => x.id === id);
  if (m) { m.status = 'sent'; m.sentAt = Date.now(); Store.save(); }
}
function sendWhatsApp(id) {
  const m = Store.db.outbox.find(x => x.id === id);
  if (!m) return;
  if (!m.phone) { toast('رقم ولي الأمر غير مسجل', true); return; }
  window.open(waLink(m.phone, m.text), '_blank');
  markSent(id);
}

const KIND = { report: ['تقرير', 'ok'], renew: ['انتهاء الباقة', 'danger'], eval: ['تقييم الحصة', 'ok'], schedule: ['مواعيد', 'gold'], test: ['اختبار', 'gray'] };
function kindPill(k) { const [l, c] = KIND[k] || [k, 'gray']; return `<span class="pill ${c}">${l}</span>`; }
function statusPill(st) {
  if (st.status === 'expired' || st.remaining <= 0) return '<span class="pill danger">منتهي</span>';
  if (st.remaining <= 2) return '<span class="pill warn">مدفوع · قارب على الانتهاء</span>';
  return '<span class="pill ok">مدفوع</span>';
}
function meter(st) {
  const pct = st.total ? Math.round(st.remaining / st.total * 100) : 0;
  const cls = st.remaining <= 0 ? 'zero' : st.remaining <= 2 ? 'low' : '';
  return `<b>${st.remaining}</b> <span class="muted small">/ ${st.total}</span><div class="meter ${cls}"><i style="width:${pct}%"></i></div>`;
}
