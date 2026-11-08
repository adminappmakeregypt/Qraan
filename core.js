/* ===================== Qraan — النواة المشتركة ===================== */
'use strict';

const DB_KEY = 'qraan_db_v1';   // البيانات القديمة في المتصفح (للنقل إلى Firebase فقط)

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
const LEVELS = ['ممتاز', 'جيد جدًا', 'جيد', 'مقبول', 'يحتاج متابعة'];
const SURAHS = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];
const DEFAULT_TPL_GROUP =
`🌸{academy}🌸
تقرير الحصة

اسم المعلمة : {teacher}
اسم الطالب .. {student}
👑👑👑👑👑

💫 \`تم تسميع حفظ جديد\` :
سورة :: {newSura}
مستوى الحفظ .. {newLevel}

💫 \`تم تسميع مراجعة\` :
سورة :: {revSura}
مستوى الحفظ : {revLevel}
🌱🌱🌱🌱🌱🌱

💫 \`الحفظ الجديد\`
سورة ... {hwNew}

-----❀✲✲❀-----
💫 \`المراجعة\`
سورة :: {hwRev}

التجويد.. {tajweed}

💫 \`الشرعي\` :
{shari}
-----❀✲✲❀-----
مدة الحلقة: {duration}
رقم الحلقة.. {lectureNo}
تاريخ الحلقة : {dayname} {date}
👑👑👑👑👑👑👑
جعلنا الله وإياكم من أهل القرآن العاملين به 🤲🤲
🌹🌹🌹🌹🌹🌹🌹`;

const defaultSettings = () => ({
  academy: 'أكاديمية Qraan',
  adminEmail: '', adminHash: '',
  whatsapp: '', adminCountry: 'EG',
  defaultLectures: 8,
  absentCounts: true,            // هل الغياب يخصم محاضرة من الباقة؟
  // ===== رسالة واتساب الوحيدة: عند انتهاء الباقة =====
  tplEnd:
`السلام عليكم
نذكركم أن اليوم كانت آخر محاضرة تحفيظ قرآن.
برجاء دفع قيمة الاشتراك الجديد.`,
  waMode: 'manual',              // manual = زر واتساب يدوي | api = إرسال تلقائي عبر WhatsApp Business API
  waPhoneId: '', waToken: '', waVersion: 'v21.0',
  waTemplate: '', waLang: 'ar',  // اسم القالب المعتمد من Meta ولغته
  waProxy: '',                   // (اختياري) رابط خادم وسيط يحمل التوكن بدل المتصفح
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
  // ===== قالب تقرير الحصة الذي يُرسل لجروب الطالب =====
  tplGroup: DEFAULT_TPL_GROUP,
});

const defaultDB = () => ({ settings: defaultSettings(), teachers: [], supervisors: [], students: [], reports: [], outbox: [] });

/* ---------- التخزين: Firebase (Firestore + Authentication) ---------- */
const COLS = ['teachers', 'supervisors', 'students', 'reports', 'outbox'];
const SECRET_KEYS = ['waToken', 'waPhoneId', 'waProxy', 'waTemplate', 'waLang', 'waVersion', 'waMode'];
const WRITABLE = { admin: COLS, supervisor: ['teachers', 'students', 'reports', 'outbox'], teacher: ['students', 'reports', 'outbox'] };
const FB = { app: null, auth: null, fs: null, app2: null };

function fbInit() {
  if (FB.app) return true;
  if (!window.firebase || !window.FIREBASE_CONFIG) return false;
  FB.app = firebase.initializeApp(window.FIREBASE_CONFIG);
  FB.auth = firebase.auth(); FB.fs = firebase.firestore();
  try { FB.fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
  return true;
}
/** تطبيق ثانوي لإنشاء حسابات المحفظين/المشرفات بدون تسجيل خروج المدير */
const fb2 = () => FB.app2 || (FB.app2 = firebase.initializeApp(window.FIREBASE_CONFIG, 'accounts'));
const clean = o => JSON.parse(JSON.stringify(o ?? null));

/* حسابات الدخول: اسم المستخدم + الرقم ← حساب Firebase (بريد داخلي + كلمة مرور مشتقة) */
const pwOf = code => `qraan#${String(code).trim()}#key`;
async function emailOf(username) { return 'u' + (await sha256('qraan:' + String(username).trim().toLowerCase())).slice(0, 32) + '@users.qraan.app'; }
const AUTH_ERR = {
  'auth/email-already-in-use': 'اسم المستخدم مستخدم بالفعل', 'auth/invalid-credential': 'اسم المستخدم أو الرقم غير صحيح',
  'auth/wrong-password': 'البيانات غير صحيحة', 'auth/user-not-found': 'الحساب غير موجود', 'auth/invalid-email': 'البريد غير صحيح',
  'auth/too-many-requests': 'محاولات كثيرة — حاول بعد دقائق', 'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت',
  'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)', 'permission-denied': 'ليس لديك صلاحية لهذا الإجراء',
};
const errMsg = e => AUTH_ERR[e?.code] || e?.message || String(e);

/** إنشاء حساب دخول لمحفظ/مشرفة أو تحديث رقمه */
async function ensureAccount(kind, obj, oldCode) {
  const a2 = fb2().auth();
  if (!obj.uid) {
    const email = await emailOf(obj.username);
    let cred;
    try { cred = await a2.createUserWithEmailAndPassword(email, pwOf(obj.code)); }
    catch (e) { if (e.code === 'auth/email-already-in-use') cred = await a2.signInWithEmailAndPassword(email, pwOf(obj.code)); else throw e; }
    const uid = cred.user.uid;
    await a2.signOut();
    await FB.fs.collection('users').doc(uid).set({ role: kind, ref: obj.id });
    return { uid, authEmail: email };
  }
  if (oldCode != null && String(oldCode) !== String(obj.code)) {
    const cred = await a2.signInWithEmailAndPassword(obj.authEmail, pwOf(oldCode));
    await cred.user.updatePassword(pwOf(obj.code)); await a2.signOut();
  }
  return null;
}
async function deleteAccount(obj) {
  if (!obj?.uid) return;
  try { await FB.fs.collection('users').doc(obj.uid).delete(); } catch (e) {}
  try { const a2 = fb2().auth(); const c = await a2.signInWithEmailAndPassword(obj.authEmail, pwOf(obj.code)); await c.user.delete(); } catch (e) {}
}

const Store = {
  db: defaultDB(), profile: null, onChange: null, _last: {}, _lastSettings: {}, _busy: 0,
  load() { return this.db; },
  teacher(id) { return this.db.teachers.find(t => t.id === id); },
  student(id) { return this.db.students.find(s => s.id === id); },
  supervisor(id) { return this.db.supervisors.find(s => s.id === id); },

  /** تطبيق بيانات من السيرفر مع الحفاظ على نفس الكائنات (المراجع في الصفحات تفضل صحيحة) */
  _apply(col, docs) {
    const old = new Map(this.db[col].map(o => [o.id, o])), out = [];
    this._last[col] = new Map();
    docs.forEach(d => {
      const data = { ...d.data, id: d.id };
      this._last[col].set(d.id, JSON.stringify(clean(data)));
      const o = old.get(d.id);
      if (o) { Object.keys(o).forEach(k => delete o[k]); Object.assign(o, data); out.push(o); } else out.push(data);
    });
    this.db[col] = out;
  },
  _applySettings(main, secret) {
    const merged = { ...defaultSettings(), ...(main || {}), ...(secret || {}) };
    Object.keys(this.db.settings).forEach(k => delete this.db.settings[k]);
    Object.assign(this.db.settings, merged);
    this._lastSettings = JSON.stringify(clean(this.db.settings));
  },
  /** بيانات مشتقة تُحفظ مع المستندات لتطبيق صلاحيات المشرفة */
  _denorm() {
    const role = this.profile?.role;
    if (role === 'teacher') return;
    this.db.teachers.forEach(t => {
      const n = Store.supervisor(t.supervisorId)?.name;
      if (!t.supervisorId) t.supervisorName = ''; else if (n) t.supervisorName = n;
    });
    this.db.students.forEach(st => { st.supId = effSupervisorId(st); });
    if (role === 'admin') this.db.reports.forEach(r => { const st = Store.student(r.studentId); if (st) r.supId = st.supId; });
  },

  /** حفظ: يكتب المستندات المتغيرة فقط على Firebase (الكتابة تظهر فورًا والمزامنة في الخلفية) */
  save() {
    const role = this.profile?.role;
    if (!role || !FB.fs) return;
    this._denorm();
    const ops = [], acc = [];
    for (const col of WRITABLE[role]) {
      const last = this._last[col] || new Map(), cur = new Map(this.db[col].map(o => [o.id, o]));
      for (const [id, o] of cur) {
        const j = JSON.stringify(clean(o));
        if (last.get(id) !== j) {
          ops.push({ col, id, data: clean(o) });
          if ((col === 'teachers' || col === 'supervisors')) {
            const prev = last.has(id) ? JSON.parse(last.get(id)) : null;
            if (!o.uid || (prev && String(prev.code) !== String(o.code))) acc.push({ kind: col === 'teachers' ? 'teacher' : 'supervisor', id, oldCode: prev?.code });
          }
          last.set(id, j);
        }
      }
      for (const id of [...last.keys()]) if (!cur.has(id)) {
        ops.push({ col, id, del: true });
        if (col === 'teachers' || col === 'supervisors') acc.push({ del: true, obj: JSON.parse(last.get(id)) });
        last.delete(id);
      }
      this._last[col] = last;
    }
    if (role === 'admin') {
      const j = JSON.stringify(clean(this.db.settings));
      if (j !== this._lastSettings) {
        const all = clean(this.db.settings), main = {}, secret = {};
        Object.entries(all).forEach(([k, v]) => (SECRET_KEYS.includes(k) ? secret : main)[k] = v);
        delete main.adminHash; delete main.adminEmail;
        ops.push({ col: 'settings', id: 'main', data: main }, { col: 'settings', id: 'secret', data: secret });
        ops.push({ col: 'meta', id: 'public', data: { academy: main.academy || 'Qraan' } });
        this._lastSettings = j;
      }
    }
    if (!ops.length && !acc.length) return;
    this._busy++;
    const run = async () => {
      for (let i = 0; i < ops.length; i += 400) {
        const b = FB.fs.batch();
        ops.slice(i, i + 400).forEach(op => { const ref = FB.fs.collection(op.col).doc(op.id); op.del ? b.delete(ref) : b.set(ref, op.data); });
        await b.commit();
      }
      for (const a of acc) {
        if (a.del) { await deleteAccount(a.obj); continue; }
        const col = a.kind === 'teacher' ? 'teachers' : 'supervisors', o = this.db[col].find(x => x.id === a.id);
        if (!o) continue;
        try {
          const r = await ensureAccount(a.kind, o, a.oldCode);
          if (r) { Object.assign(o, r); await FB.fs.collection(col).doc(o.id).update(r); this._last[col].set(o.id, JSON.stringify(clean(o))); }
        } catch (e) { toast(`تعذر إنشاء/تحديث حساب دخول «${o.name}»: ${errMsg(e)}`, true); }
      }
    };
    this._pending = run().catch(e => { toast('لم يتم الحفظ على السيرفر: ' + errMsg(e), true); console.error(e); })
      .finally(() => { this._busy--; });
    return this._pending;
  },
};
/** المشرفة الفعلية للطالب: المحددة له، وإلا مشرفة محفظه — أي تغيير في المحفظ ينعكس على كل طلابه */
const effSupervisorId = st => (st && (st.supervisorId || Store.teacher(st.teacherId)?.supervisorId)) || '';
const supervisorName = id => Store.supervisor(id)?.name || Store.db.teachers.find(t => t.supervisorId === id)?.supervisorName || '';
const supervisorOptions = (sel, empty = '— بدون مشرفة —') => `<option value="">${empty}</option>` +
  Store.db.supervisors.map(u => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${esc(u.name)}${u.active === false ? ' (موقوفة)' : ''}</option>`).join('');
/** اسم المستخدم محجوز (محفظ أو مشرفة) */
function usernameTaken(uname, exceptId) {
  const u = String(uname).trim().toLowerCase();
  return [...Store.db.teachers, ...Store.db.supervisors].some(x => x.id !== exceptId && String(x.username).toLowerCase() === u);
}

/* ---------- الجلسة والدخول ---------- */
const Session = { get: () => Store.profile, set() {}, clear() {} };
const PAGE = { admin: 'admin.html', supervisor: 'supervisor.html', teacher: 'teacher.html' };
async function logout() { try { await FB.auth?.signOut(); } catch (e) {} location.href = 'index.html'; }

/** من هو المستخدم الحالي؟ مدير (meta/owner) أو محفظ/مشرفة (users/uid) */
async function resolveProfile(user) {
  const own = await FB.fs.collection('meta').doc('owner').get();
  if (own.exists && own.data().uid === user.uid) return { role: 'admin', id: 'admin', email: user.email };
  const u = await FB.fs.collection('users').doc(user.uid).get();
  return u.exists ? { role: u.data().role, id: u.data().ref } : null;
}
const authUser = () => new Promise(res => { const off = FB.auth.onAuthStateChanged(u => { off(); res(u); }); });

function fatal(html) { document.body.innerHTML = `<div class="auth-wrap"><div class="auth-card">${html}</div></div>`; }

/** تشغيل الصفحة: يتحقق من الدخول ثم يربط البيانات المباشرة حسب الدور */
async function boot(role) {
  if (!fbInit()) { fatal('<h3>تعذر تحميل Firebase</h3><p class="muted">تأكد من الاتصال بالإنترنت ومن ملف <code>firebase-config.js</code>.</p>'); throw new Error('no firebase'); }
  document.body.classList.add('loading');
  const user = await authUser();
  if (!user) { location.href = 'index.html'; throw new Error('no user'); }
  let p;
  try { p = await resolveProfile(user); } catch (e) { fatal(`<h3>تعذر الاتصال</h3><p class="muted">${esc(errMsg(e))}</p><button class="btn" onclick="location.reload()">إعادة المحاولة</button>`); throw e; }
  if (!p) { await FB.auth.signOut(); location.href = 'index.html'; throw new Error('no profile'); }
  if (p.role !== role) { location.href = PAGE[p.role]; throw new Error('wrong page'); }
  Store.profile = p;
  const fs = FB.fs, listeners = [];
  const q = {
    admin: { teachers: fs.collection('teachers'), supervisors: fs.collection('supervisors'), students: fs.collection('students'), reports: fs.collection('reports'), outbox: fs.collection('outbox') },
    supervisor: { supervisors: fs.collection('supervisors').doc(p.id), teachers: fs.collection('teachers').where('supervisorId', '==', p.id),
      students: fs.collection('students').where('supId', '==', p.id), reports: fs.collection('reports').where('supId', '==', p.id) },
    teacher: { teachers: fs.collection('teachers').doc(p.id), students: fs.collection('students').where('teacherId', '==', p.id),
      reports: fs.collection('reports').where('teacherId', '==', p.id), outbox: fs.collection('outbox').where('teacherId', '==', p.id) },
  }[role];
  let main = null, secret = null;
  const waits = [];
  const notify = () => { if (Store._ready && Store.onChange) Store.onChange(); };
  const listen = (ref, onData) => waits.push(new Promise((res, rej) => {
    let first = true;
    listeners.push(ref.onSnapshot({ includeMetadataChanges: false }, snap => { onData(snap); if (first) { first = false; res(); } else notify(); },
      err => { if (first) rej(err); else toast('انقطع الاتصال بالبيانات: ' + errMsg(err), true); }));
  }));
  for (const [col, ref] of Object.entries(q)) {
    listen(ref, snap => Store._apply(col, snap.docs ? snap.docs.map(d => ({ id: d.id, data: d.data() })) : (snap.exists ? [{ id: snap.id, data: snap.data() }] : [])));
  }
  listen(fs.collection('settings').doc('main'), d => { main = d.exists ? d.data() : null; Store._applySettings(main, secret); });
  if (role === 'admin') listen(fs.collection('settings').doc('secret'), d => { secret = d.exists ? d.data() : null; Store._applySettings(main, secret); });
  try { await Promise.all(waits); }
  catch (e) { fatal(`<h3>تعذر تحميل البيانات</h3><p class="muted">${esc(errMsg(e))}</p><button class="btn" onclick="logout()">خروج</button>`); throw e; }
  const meDoc = role === 'teacher' ? Store.teacher(p.id) : role === 'supervisor' ? Store.supervisor(p.id) : true;
  if (!meDoc || meDoc.active === false) { await FB.auth.signOut(); alert('الحساب موقوف أو محذوف — تواصل مع الإدارة'); location.href = 'index.html'; throw new Error('inactive'); }
  Store._ready = true;
  document.body.classList.remove('loading');
  return p;
}

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

function queueMessage(kind, st, text) {
  const m = {
    id: uid(), kind, studentId: st.id, studentName: st.name, teacherId: st.teacherId, supId: effSupervisorId(st),
    phone: normPhone(st.parentPhone, st.country), text, createdAt: Date.now(), status: 'pending',
  };
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

function recordSession(st, teacher, occ, attendance, report = null) {
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
    supId: effSupervisorId(st),
  };
  Store.db.reports.push(rep);
  if (attendance === 'present' && report) setGroupReport(rep, report);

  const msgs = [];
  if (st.remaining <= 0) {   // آخر محاضرة في الباقة → رسالة واحدة لولي الأمر
    st.status = 'expired'; st.expiredAt = Date.now();
    msgs.push(queueMessage('renew', st, fill(S.tplEnd, msgVars(st))));
  }
  rep.msgIds = msgs.map(m => m.id); rep.msgId = msgs[0]?.id || null;
  Store.save();
  return { rep, msgs };
}

/* ---------- تقرير الحصة → جروب الطالب ---------- */
const durationText = m => { m = +m || 0; return m === 30 ? 'نصف ساعة' : m === 60 ? 'ساعة' : m === 45 ? 'ثلاثة أرباع ساعة' : m === 90 ? 'ساعة ونصف' : m ? `${m} دقيقة` : ''; };
const dmy = iso => { const [y, m, d] = String(iso).split('-'); return d ? `${+d}/${+m}/${y}` : iso; };

function groupVars(rep) {
  const st = Store.student(rep.studentId), t = Store.teacher(rep.teacherId), f = rep.report || {};
  return {
    academy: Store.db.settings.academy, teacher: t?.name || '', student: st?.name || '',
    newSura: f.newSura, newLevel: f.newLevel, revSura: f.revSura, revLevel: f.revLevel,
    hwNew: f.hwNew, hwRev: f.hwRev, tajweed: f.tajweed, shari: f.shari, duration: f.duration,
    lectureNo: rep.lectureNo, dayname: DAYS[new Date(rep.date + 'T12:00:00Z').getUTCDay()] || '', date: dmy(rep.date),
  };
}
const buildGroupText = rep => fill(Store.db.settings.tplGroup || DEFAULT_TPL_GROUP, groupVars(rep));

/** حفظ/تعديل تقرير الحصة على محاضرة مسجلة — يصبح «جاهز للإرسال» عند المشرفة */
function setGroupReport(rep, report) {
  if (rep.group?.status === 'sent') throw new Error('التقرير اتبعت للجروب بالفعل — لا يمكن تعديله');
  const st = Store.student(rep.studentId);
  rep.report = { ...report };
  rep.groupText = buildGroupText(rep);
  rep.group = { ...(rep.group || {}), status: 'ready', groupName: st?.groupName || '', updatedAt: Date.now() };
  rep.group.createdAt ||= Date.now();
  Store.save();
  return rep;
}
const groupReports = () => Store.db.reports.filter(r => r.group);
const whoLabel = w => w ? `${w.name}${w.role === 'admin' ? ' (الإدارة)' : ''}` : '';

/** فتح واتساب على موبايل/كمبيوتر المستخدم والرسالة جاهزة — يختار الجروب بنفسه ويضغط إرسال */
function openGroupShare(repId, who) {
  const r = Store.db.reports.find(x => x.id === repId);
  if (!r?.group) return;
  const st = Store.student(r.studentId);
  if (st?.groupName && st.groupName !== r.group.groupName) r.group.groupName = st.groupName;
  r.group.openedAt = Date.now(); r.group.openedBy = who; Store.save();
  const g = r.group.groupName;
  if (g && navigator.clipboard) navigator.clipboard.writeText(g).catch(() => {});
  window.open('https://wa.me/?text=' + encodeURIComponent(r.groupText), '_blank');
}
function confirmGroupSent(repId, who) {
  const r = Store.db.reports.find(x => x.id === repId);
  if (!r?.group) return;
  Object.assign(r.group, { status: 'sent', sentAt: Date.now(), sentBy: who });
  Store.save();
}
function unsendGroup(repId) {
  const r = Store.db.reports.find(x => x.id === repId);
  if (!r?.group) return;
  r.group.status = 'ready'; delete r.group.sentAt; delete r.group.sentBy; Store.save();
}

/** إحصائيات المحفظين: محاضرات + تقارير + ما اتبعت للجروبات (month = 'YYYY-MM' أو 'all') */
function teacherReportStats(country, month, repScope = null, teacherScope = null) {
  const reps = Store.db.reports.filter(r => (month === 'all' || repWhen(r, country).iso.startsWith(month)) && (!repScope || repScope(r)));
  const ts = Store.db.teachers.filter(t => !teacherScope || teacherScope(t) || reps.some(r => r.teacherId === t.id));
  return ts.map(t => {
    const rs = reps.filter(r => r.teacherId === t.id), g = rs.filter(r => r.group);
    return {
      t, lectures: rs.length, present: rs.filter(r => r.attendance === 'present').length, absent: rs.filter(r => r.attendance !== 'present').length,
      reports: g.length, sent: g.filter(r => r.group.status === 'sent').length, ready: g.filter(r => r.group.status !== 'sent').length,
      noReport: rs.filter(r => r.attendance === 'present' && !r.group).length,
    };
  });
}

/* ---------- واجهة مشتركة: قائمة تقارير الجروبات (المشرفة + الإدارة) ---------- */
const grp = { tab: 'ready', teacher: '', sup: '', q: '' };
let _awaitConfirm = null;
/** scope: دالة تحدد التقارير المسموح بعرضها (للمشرفة: طلابها فقط) — بدونها (المدير) يظهر فلتر المشرفة */
function groupReportsView(country, scope = null) {
  const all = groupReports().filter(r => !scope || scope(r));
  const ready = all.filter(r => r.group.status !== 'sent'), sent = all.filter(r => r.group.status === 'sent');
  const q = grp.q.trim().toLowerCase();
  const list = (grp.tab === 'ready' ? ready : sent).filter(r => {
    const st = Store.student(r.studentId);
    return (!grp.teacher || r.teacherId === grp.teacher) && (scope || !grp.sup || effSupervisorId(st) === (grp.sup === 'none' ? '' : grp.sup)) && (!q || ((st?.name || '') + ' ' + (r.group.groupName || '')).toLowerCase().includes(q));
  }).sort((a, b) => grp.tab === 'ready' ? (a.sessionTs || a.createdAt) - (b.sessionTs || b.createdAt) : b.group.sentAt - a.group.sentAt);
  return `
  <div class="topbar"><h2>تقارير الحصص للجروبات</h2>
    <div class="seg" style="margin:0;min-width:280px"><button class="${grp.tab === 'ready' ? 'active' : ''}" onclick="grp.tab='ready';render()">جاهزة للإرسال (${ready.length})</button><button class="${grp.tab === 'sent' ? 'active' : ''}" onclick="grp.tab='sent';render()">المُرسلة (${sent.length})</button></div></div>
  <div class="toolbar">
    <input placeholder="🔍 بحث باسم الطالب أو الجروب" value="${esc(grp.q)}" oninput="grp.q=this.value;grpDebounce()">
    ${scope ? '' : `<select onchange="grp.sup=this.value;render()"><option value="">كل المشرفات</option>${Store.db.supervisors.map(u => `<option value="${u.id}" ${u.id === grp.sup ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}<option value="none" ${grp.sup === 'none' ? 'selected' : ''}>بدون مشرفة</option></select>`}
    <select onchange="grp.teacher=this.value;render()"><option value="">كل المحفظين</option>${Store.db.teachers.filter(t => !scope || all.some(r => r.teacherId === t.id) || t.supervisorId === window.WHO?.id).map(t => `<option value="${t.id}" ${t.id === grp.teacher ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
  </div>
  ${grp.tab === 'ready' ? '<div class="note small">اضغطي «إرسال للجروب» ← واتساب هيفتح والرسالة جاهزة ← اختاري الجروب (اسمه اتنسخ، الصقيه في البحث) ← إرسال ← ارجعي وأكّدي «اتبعت».</div>' : ''}
  ${list.length ? `<div class="gcards">${list.map(r => groupCard(r, country, !scope)).join('')}</div>` : `<div class="card empty">${grp.tab === 'ready' ? 'لا توجد تقارير في انتظار الإرسال ✅' : 'لا توجد تقارير مُرسلة بعد.'}</div>`}`;
}
function groupCard(r, country, showSup = false) {
  const st = Store.student(r.studentId), w = repWhen(r, country), g = r.group, sent = g.status === 'sent';
  const gname = st?.groupName || g.groupName;
  return `<div class="gcard ${sent ? 'sent' : g.openedAt ? 'opened' : ''}">
    <div class="gcard-head"><div><b>${esc(st?.name || '—')}</b><div class="muted small">${esc(Store.teacher(r.teacherId)?.name || '—')} · الحلقة ${r.lectureNo || '—'} · ${fmtDayDate(w.iso)}${w.time ? ' ' + fmtTime(w.time) : ''}</div>${showSup ? `<div class="small">👩‍💼 ${esc(supervisorName(effSupervisorId(st)) || 'بدون مشرفة')}</div>` : ''}</div>
      ${sent ? '<span class="pill ok">✅ اتبعت</span>' : g.openedAt ? '<span class="pill warn">اتفتح في واتساب</span>' : '<span class="pill gold">جاهز للإرسال</span>'}</div>
    <div class="gname">${gname ? `👥 ${esc(gname)}` : '<span style="color:var(--danger)">⚠️ اسم الجروب غير مسجل للطالب</span>'}</div>
    <details><summary class="small">عرض الرسالة</summary><div class="msg-preview">${esc(r.groupText)}</div></details>
    ${sent ? `<div class="muted small">أُرسل ${fmtDateTime(g.sentAt)} بواسطة ${esc(whoLabel(g.sentBy))}</div>
      <div class="gact"><button class="btn sm ghost" onclick="grpSend('${r.id}')">إعادة الفتح في واتساب</button><button class="btn sm ghost" onclick="grpUnsend('${r.id}')">رجوع لـ «جاهز»</button></div>`
    : `<div class="gact"><button class="btn wa" onclick="grpSend('${r.id}')">📤 إرسال للجروب</button>
      ${g.openedAt ? `<button class="btn" onclick="grpConfirm('${r.id}')">✅ اتبعت</button>` : ''}</div>`}
  </div>`;
}
let _gt; function grpDebounce() { clearTimeout(_gt); _gt = setTimeout(() => { const pos = document.activeElement?.selectionStart; render(); const i = $('.toolbar input'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }, 250); }
function grpSend(id) {
  const r = Store.db.reports.find(x => x.id === id);
  openGroupShare(id, window.WHO);
  if (r?.group.status !== 'sent') { _awaitConfirm = id; toast(r?.group.groupName ? `اسم الجروب اتنسخ: ${r.group.groupName}` : 'اختاري جروب الطالب في واتساب'); }
  render();
}
function grpConfirm(id) { confirmGroupSent(id, window.WHO); _awaitConfirm = null; closeModal(); toast('تم تسجيل الإرسال ✅'); render(); }
function grpUnsend(id) { if (!confirmBox('إرجاع التقرير لقائمة «جاهز للإرسال»؟')) return; unsendGroup(id); render(); }
// عند الرجوع من واتساب: نسأل «اتبعت؟»
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !_awaitConfirm) return;
  const r = Store.db.reports.find(x => x.id === _awaitConfirm); if (!r?.group || r.group.status === 'sent') return;
  const st = Store.student(r.studentId), id = _awaitConfirm;
  setTimeout(() => openModal('تأكيد الإرسال', `<p>تم إرسال تقرير <b>${esc(st?.name || '')}</b> لجروب <b>${esc(r.group.groupName || '—')}</b>؟</p>`,
    `<button class="btn" onclick="grpConfirm('${id}')">✅ أيوه، اتبعت</button><button class="btn ghost" onclick="_awaitConfirm=null;closeModal()">لسه</button>`), 300);
});

/* ---------- نموذج تقرير الحصة (المحفظ) ---------- */
function reportFormHtml(st, f = {}) {
  const lv = (name, v) => `<select name="${name}">${LEVELS.map(l => `<option ${l === (v || 'ممتاز') ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const inp = (name, v, ph = '', list = true) => `<input name="${name}" value="${esc(v || '')}" placeholder="${ph}" ${list ? 'list="surahList"' : ''}>`;
  return `<form id="repf">
    <datalist id="surahList">${SURAHS.map(s => `<option value="${s}">`).join('')}</datalist>
    <div class="note small" style="margin-bottom:10px">👥 جروب الطالب: <b>${esc(st.groupName || 'غير مسجل — بلّغ الإدارة')}</b></div>
    <div class="rsec">💫 تسميع الحفظ الجديد</div>
    <div class="row"><div class="field"><label>السورة</label>${inp('newSura', f.newSura, 'مثال: النبأ')}</div><div class="field"><label>مستوى الحفظ</label>${lv('newLevel', f.newLevel)}</div></div>
    <div class="rsec">💫 تسميع المراجعة</div>
    <div class="row"><div class="field"><label>السورة / الجزء</label>${inp('revSura', f.revSura, 'مثال: جزء المجادلة')}</div><div class="field"><label>مستوى الحفظ</label>${lv('revLevel', f.revLevel)}</div></div>
    <div class="rsec">💫 الواجب القادم</div>
    <div class="row"><div class="field"><label>الحفظ الجديد</label>${inp('hwNew', f.hwNew, 'السورة المطلوبة')}</div><div class="field"><label>المراجعة</label>${inp('hwRev', f.hwRev, 'السورة / الجزء')}</div></div>
    <div class="row"><div class="field"><label>التجويد</label>${inp('tajweed', f.tajweed, 'مثال: الإظهار الحلقي', false)}</div><div class="field"><label>الشرعي</label>${inp('shari', f.shari ?? 'لا يوجد', '', false)}</div></div>
    <div class="field"><label>مدة الحلقة</label>${inp('duration', f.duration ?? durationText(st.duration || 30), '', false)}</div>
    <details><summary class="small">معاينة الرسالة</summary><div class="msg-preview" id="repPrev"></div></details>
  </form>`;
}
function readReportForm() { const d = Object.fromEntries(new FormData($('#repf'))); Object.keys(d).forEach(k => d[k] = String(d[k]).trim()); return d; }
function bindReportPreview(fakeRep) {
  const upd = () => { $('#repPrev').textContent = fill(Store.db.settings.tplGroup || DEFAULT_TPL_GROUP, groupVars({ ...fakeRep, report: readReportForm() })); };
  $('#repf').addEventListener('input', upd); $('#repf').addEventListener('change', upd); upd();
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

/** إرسال رسالة عبر WhatsApp Business API (أو الخادم الوسيط) */
async function apiSend(m) {
  const S = Store.db.settings;
  if (!m.phone) throw new Error('رقم ولي الأمر غير مسجل');
  let res, body;
  if (S.waProxy) {
    res = await fetch(S.waProxy, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: m.phone, template: S.waTemplate, language: S.waLang, text: m.text }) });
  } else {
    if (!S.waPhoneId || !S.waToken || !S.waTemplate) throw new Error('إعدادات WhatsApp API غير مكتملة');
    res = await fetch(`https://graph.facebook.com/${S.waVersion || 'v21.0'}/${S.waPhoneId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.waToken },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: m.phone, type: 'template', template: { name: S.waTemplate, language: { code: S.waLang || 'ar' } } }),
    });
  }
  try { body = await res.json(); } catch { body = {}; }
  if (!res.ok) throw new Error(body?.error?.message || ('HTTP ' + res.status));
  return body;
}
/** تسليم الرسالة: تلقائي لو API مفعّل، وإلا تبقى في الانتظار للإرسال اليدوي */
async function deliver(m) {
  if (Store.profile?.role !== 'admin' || Store.db.settings.waMode !== 'api') return 'manual';   // التوكن عند الإدارة فقط
  try {
    const r = await apiSend(m);
    m.status = 'sent'; m.sentAt = Date.now(); m.via = 'api'; m.waId = r?.messages?.[0]?.id || ''; delete m.error;
    Store.save(); return 'sent';
  } catch (e) {
    m.status = 'pending'; m.error = e.message; m.lastTry = Date.now(); Store.save(); return 'failed';
  }
}

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

const KIND = { report: ['تقرير', 'ok'], renew: ['انتهاء الباقة', 'danger'], schedule: ['مواعيد', 'gold'], test: ['اختبار', 'gray'] };
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
