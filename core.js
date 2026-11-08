/* ===================== Qraan — النواة المشتركة ===================== */
'use strict';

const DB_KEY = 'qraan_db_v1';
const SESSION_KEY = 'qraan_session';

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

/* ---------- التخزين ---------- */
const Store = {
  db: null,
  load() {
    try { this.db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { this.db = null; }
    if (!this.db) this.db = defaultDB();
    this.db.settings = { ...defaultSettings(), ...this.db.settings };
    ['teachers', 'supervisors', 'students', 'reports', 'outbox'].forEach(k => { this.db[k] = this.db[k] || []; });
    if (!this.db.settings.msgV2) {   // إلغاء كل الرسائل القديمة — الإبقاء على رسائل انتهاء الباقة فقط
      this.db.outbox = this.db.outbox.filter(m => m.kind === 'renew' && m.status === 'sent');
      this.db.settings.msgV2 = true; this.save();
    }
    return this.db;
  },
  save() { localStorage.setItem(DB_KEY, JSON.stringify(this.db)); },
  teacher(id) { return this.db.teachers.find(t => t.id === id); },
  student(id) { return this.db.students.find(s => s.id === id); },
  supervisor(id) { return this.db.supervisors.find(s => s.id === id); },
};
/** اسم المستخدم محجوز (محفظ أو مشرفة) */
function usernameTaken(uname, exceptId) {
  const u = String(uname).trim().toLowerCase();
  return [...Store.db.teachers, ...Store.db.supervisors].some(x => x.id !== exceptId && String(x.username).toLowerCase() === u);
}

/* ---------- الجلسة ---------- */
const Session = {
  get() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; } },
  set(v) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(v)); },
  clear() { sessionStorage.removeItem(SESSION_KEY); },
};
function logout() { Session.clear(); location.href = 'index.html'; }

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
    id: uid(), kind, studentId: st.id, studentName: st.name, teacherId: st.teacherId,
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
function teacherReportStats(country, month) {
  const reps = Store.db.reports.filter(r => month === 'all' || repWhen(r, country).iso.startsWith(month));
  return Store.db.teachers.map(t => {
    const rs = reps.filter(r => r.teacherId === t.id), g = rs.filter(r => r.group);
    return {
      t, lectures: rs.length, present: rs.filter(r => r.attendance === 'present').length, absent: rs.filter(r => r.attendance !== 'present').length,
      reports: g.length, sent: g.filter(r => r.group.status === 'sent').length, ready: g.filter(r => r.group.status !== 'sent').length,
      noReport: rs.filter(r => r.attendance === 'present' && !r.group).length,
    };
  });
}

/* ---------- واجهة مشتركة: قائمة تقارير الجروبات (المشرفة + الإدارة) ---------- */
const grp = { tab: 'ready', teacher: '', q: '' };
let _awaitConfirm = null;
function groupReportsView(country) {
  const all = groupReports();
  const ready = all.filter(r => r.group.status !== 'sent'), sent = all.filter(r => r.group.status === 'sent');
  const q = grp.q.trim().toLowerCase();
  const list = (grp.tab === 'ready' ? ready : sent).filter(r => {
    const st = Store.student(r.studentId);
    return (!grp.teacher || r.teacherId === grp.teacher) && (!q || ((st?.name || '') + ' ' + (r.group.groupName || '')).toLowerCase().includes(q));
  }).sort((a, b) => grp.tab === 'ready' ? (a.sessionTs || a.createdAt) - (b.sessionTs || b.createdAt) : b.group.sentAt - a.group.sentAt);
  return `
  <div class="topbar"><h2>تقارير الحصص للجروبات</h2>
    <div class="seg" style="margin:0;min-width:280px"><button class="${grp.tab === 'ready' ? 'active' : ''}" onclick="grp.tab='ready';render()">جاهزة للإرسال (${ready.length})</button><button class="${grp.tab === 'sent' ? 'active' : ''}" onclick="grp.tab='sent';render()">المُرسلة (${sent.length})</button></div></div>
  <div class="toolbar">
    <input placeholder="🔍 بحث باسم الطالب أو الجروب" value="${esc(grp.q)}" oninput="grp.q=this.value;grpDebounce()">
    <select onchange="grp.teacher=this.value;render()"><option value="">كل المحفظين</option>${Store.db.teachers.map(t => `<option value="${t.id}" ${t.id === grp.teacher ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
  </div>
  ${grp.tab === 'ready' ? '<div class="note small">اضغطي «إرسال للجروب» ← واتساب هيفتح والرسالة جاهزة ← اختاري الجروب (اسمه اتنسخ، الصقيه في البحث) ← إرسال ← ارجعي وأكّدي «اتبعت».</div>' : ''}
  ${list.length ? `<div class="gcards">${list.map(r => groupCard(r, country)).join('')}</div>` : `<div class="card empty">${grp.tab === 'ready' ? 'لا توجد تقارير في انتظار الإرسال ✅' : 'لا توجد تقارير مُرسلة بعد.'}</div>`}`;
}
function groupCard(r, country) {
  const st = Store.student(r.studentId), w = repWhen(r, country), g = r.group, sent = g.status === 'sent';
  const gname = st?.groupName || g.groupName;
  return `<div class="gcard ${sent ? 'sent' : g.openedAt ? 'opened' : ''}">
    <div class="gcard-head"><div><b>${esc(st?.name || '—')}</b><div class="muted small">${esc(Store.teacher(r.teacherId)?.name || '—')} · الحلقة ${r.lectureNo || '—'} · ${fmtDayDate(w.iso)}${w.time ? ' ' + fmtTime(w.time) : ''}</div></div>
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
  if (Store.db.settings.waMode !== 'api') return 'manual';
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
