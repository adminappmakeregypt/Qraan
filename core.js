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

const defaultSettings = () => ({
  academy: 'أكاديمية Qraan',
  adminEmail: '', adminHash: '',
  whatsapp: '', adminCountry: 'EG',
  defaultLectures: 8,
  absentCounts: true,            // هل الغياب يخصم محاضرة من الباقة؟
  teacherCanSend: false,         // هل يرسل المحفظ الرسالة من هاتفه مباشرة؟
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

/* ---------- التخزين ---------- */
const Store = {
  db: null,
  load() {
    try { this.db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { this.db = null; }
    if (!this.db) this.db = defaultDB();
    this.db.settings = { ...defaultSettings(), ...this.db.settings };
    ['teachers', 'students', 'reports', 'outbox'].forEach(k => { this.db[k] = this.db[k] || []; });
    return this.db;
  },
  save() { localStorage.setItem(DB_KEY, JSON.stringify(this.db)); },
  teacher(id) { return this.db.teachers.find(t => t.id === id); },
  student(id) { return this.db.students.find(s => s.id === id); },
};

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

function recordSession(st, teacher, occ, attendance) {
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

  const loc = localOf(occ.ts, st.country);   // ولي الأمر يرى الموعد بتوقيت بلده
  const v = msgVars(st, { date: loc.iso, dayname: DAYS[loc.day], time: fmtTime(loc.time), attendance: ATT[attendance] });
  const msgs = [queueMessage('report', st, fill(S.tplSession, v))];
  if (st.remaining <= 0) {
    st.status = 'expired'; st.expiredAt = Date.now();
    msgs.push(queueMessage('renew', st, fill(S.tplRenew, v)));
  }
  rep.msgIds = msgs.map(m => m.id); rep.msgId = msgs[0].id;
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
      if (overlap && !(st.id === exceptStudentId && a === m)) out.push(`${st.name} (${fmtSlot(x)})`);
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

const KIND = { report: ['تقرير', 'ok'], renew: ['تذكير اشتراك', 'danger'], schedule: ['مواعيد', 'gold'] };
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
