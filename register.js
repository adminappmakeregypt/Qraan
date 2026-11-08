/* ===================== Qraan — سجل البيانات (صفحة عامة بدون تسجيل دخول) ===================== */
'use strict';

const DRAFT_KEY = 'qraan_register_draft';
const DURATIONS = [30, 45, 60];
let F = null;
const newStudent = (country = 'EG') => ({
  name: '', country, parentName: '', parentPhone: '',
  total: 8, remaining: 8, status: 'paid', startDate: '',
  tzBase: 'T', duration: 30, slots: [{ day: 0, time: '17:00' }],
  level: '', link: '', notes: '', groupName: '',
});
let state = { teacher: { name: '', country: 'EG', phone: '', supervisor: '', notes: '' }, students: [newStudent()] };
let sent = null;

/* ---------- مسودة محفوظة على الجهاز ---------- */
function loadDraft() {
  try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY)); if (d && d.teacher && Array.isArray(d.students)) state = d; } catch (e) { }
}
let _sv; function saveDraft() { clearTimeout(_sv); _sv = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch (e) { } }, 300); }
function flushDraft() { clearTimeout(_sv); if (!sent) try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch (e) { } }
addEventListener('pagehide', flushDraft);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushDraft(); });
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) { } }

/* ---------- ربط الحقول بالبيانات ---------- */
function setPath(obj, path, val) {
  const ks = path.split('.'); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) o = o[isNaN(ks[i]) ? ks[i] : +ks[i]];
  const last = ks[ks.length - 1]; o[isNaN(last) ? last : +last] = val;
}
const opt = (v, sel, label) => `<option value="${v}" ${String(v) === String(sel) ? 'selected' : ''}>${label}</option>`;
const field = (label, k, v, attrs = '', req = false) =>
  `<div class="field"><label>${label}${req ? ' <span class="req">*</span>' : ''}</label><input data-k="${k}" value="${esc(v)}" ${attrs}></div>`;

function studentCard(s, i) {
  const n = state.students.length;
  const tName = COUNTRIES[state.teacher.country]?.name || 'المحفظ';
  return `<section class="card st-card" id="st${i}">
    <div class="st-head"><h3>الطالب ${i + 1}${s.name ? ` — ${esc(s.name)}` : ''}</h3>
      <div class="st-acts">
        <button type="button" class="btn sm ghost" onclick="dupStudent(${i})" title="نسخ بنفس المواعيد">نسخ</button>
        ${n > 1 ? `<button type="button" class="btn sm danger" onclick="delStudent(${i})">حذف</button>` : ''}
      </div></div>
    <div class="row">
      ${field('اسم الطالب', `students.${i}.name`, s.name, 'required maxlength="60"', true)}
      <div class="field"><label>بلد الطالب <span class="req">*</span></label><select data-k="students.${i}.country">${Object.entries(COUNTRIES).map(([k, c]) => opt(k, s.country, `${c.flag} ${c.name}`)).join('')}</select></div>
    </div>
    <div class="row">
      ${field('اسم ولي الأمر', `students.${i}.parentName`, s.parentName, 'maxlength="60"')}
      ${field('رقم واتساب ولي الأمر', `students.${i}.parentPhone`, s.parentPhone, 'required inputmode="tel" dir="ltr" placeholder="01xxxxxxxxx أو 05xxxxxxxx" maxlength="20"', true)}
    </div>
    ${field('اسم جروب واتساب بتاع الطالب', `students.${i}.groupName`, s.groupName || '', 'maxlength="80" placeholder="اكتبه بالظبط زي ما هو في واتساب"')}
    <h4>الاشتراك</h4>
    <div class="row3">
      <div class="field"><label>عدد محاضرات الباقة <span class="req">*</span></label><input data-k="students.${i}.total" type="number" min="1" max="100" value="${s.total}" data-num></div>
      <div class="field"><label>المحاضرات المتبقية <span class="req">*</span></label><input data-k="students.${i}.remaining" type="number" min="0" max="100" value="${s.remaining}" data-num></div>
      <div class="field"><label>حالة الاشتراك</label><select data-k="students.${i}.status">${opt('paid', s.status, 'مدفوع')}${opt('expired', s.status, 'منتهي / لم يدفع')}</select></div>
    </div>
    <div class="row">
      ${field('تاريخ آخر دفع / بداية الباقة', `students.${i}.startDate`, s.startDate, 'type="date"')}
      <div class="field"><label>مدة الحصة</label><select data-k="students.${i}.duration" data-num>${DURATIONS.map(d => opt(d, s.duration, d + ' دقيقة')).join('')}</select></div>
    </div>
    <h4>مواعيد الحصص الأسبوعية <span class="req">*</span></h4>
    <div class="radio-row tzr">
      <label><input type="radio" name="tz${i}" data-k="students.${i}.tzBase" value="T" ${s.tzBase !== 'S' ? 'checked' : ''}><span>بتوقيتي (${esc(tName)})</span></label>
      <label><input type="radio" name="tz${i}" data-k="students.${i}.tzBase" value="S" ${s.tzBase === 'S' ? 'checked' : ''}><span>بتوقيت الطالب (${COUNTRIES[s.country].name})</span></label>
    </div>
    ${s.slots.map((sl, j) => `<div class="slot-row">
      <select data-k="students.${i}.slots.${j}.day" data-num>${DAYS.map((d, x) => opt(x, sl.day, d)).join('')}</select>
      <input type="time" data-k="students.${i}.slots.${j}.time" value="${sl.time}">
      <button type="button" class="btn sm danger" onclick="delSlot(${i},${j})" ${s.slots.length < 2 ? 'disabled' : ''}>✕</button></div>`).join('')}
    <button type="button" class="btn sm ghost" onclick="addSlot(${i})">+ موعد آخر</button>
    <h4>معلومات إضافية <span class="muted small">(اختياري)</span></h4>
    <div class="row">
      ${field('المستوى / الحفظ الحالي', `students.${i}.level`, s.level, 'maxlength="100" placeholder="مثال: يحفظ جزء عمّ — وصل سورة النبأ"')}
      ${field('رابط الحلقة (Zoom / Meet)', `students.${i}.link`, s.link, 'dir="ltr" maxlength="200" placeholder="https://"')}
    </div>
    <div class="field"><label>ملاحظات</label><textarea data-k="students.${i}.notes" maxlength="300" placeholder="أي معلومة تفيد الإدارة: مواعيد غير ثابتة، إجازة، طريقة الدفع...">${esc(s.notes)}</textarea></div>
  </section>`;
}

function render() {
  const app = $('#app');
  if (sent) {
    app.innerHTML = `<section class="card done-card">
      <div class="done-ic">✅</div><h2>تم إرسال البيانات</h2>
      <p>شكرًا ${esc(sent.name)} — وصلت بيانات <b>${sent.count}</b> طالب للإدارة.</p>
      <p class="muted">رقم المرجع: <b dir="ltr">${sent.ref}</b></p>
      <button class="btn" onclick="sent=null;state={teacher:{name:'',country:'EG',phone:'',supervisor:'',notes:''},students:[newStudent()]};render()">تسجيل بيانات محفظ آخر</button>
    </section>`;
    return;
  }
  const t = state.teacher;
  app.innerHTML = `
  <div class="note">املأ بياناتك وبيانات كل طلابك، ثم اضغط «إرسال». البيانات تُحفظ تلقائيًا على جهازك لو قفلت الصفحة وكمّلت بعدين.</div>
  <section class="card">
    <h3>👤 بيانات المحفظ</h3>
    <div class="row">
      ${field('الاسم', 'teacher.name', t.name, 'required maxlength="60"', true)}
      <div class="field"><label>البلد <span class="req">*</span></label><select data-k="teacher.country" data-rerender>${Object.entries(COUNTRIES).map(([k, c]) => opt(k, t.country, `${c.flag} ${c.name}`)).join('')}</select></div>
    </div>
    <div class="row">
      ${field('رقم الواتساب', 'teacher.phone', t.phone, 'required inputmode="tel" dir="ltr" maxlength="20"', true)}
      ${field('اسم المشرفة', 'teacher.supervisor', t.supervisor, 'required maxlength="60"', true)}
    </div>
    <div class="field"><label>ملاحظات <span class="muted small">(اختياري)</span></label><textarea data-k="teacher.notes" maxlength="300" placeholder="مثال: متاح أيام السبت فقط، أو أي معلومة للإدارة">${esc(t.notes)}</textarea></div>
  </section>
  <div class="st-count"><h2>🎓 الطلاب (${state.students.length})</h2></div>
  ${state.students.map(studentCard).join('')}
  <button type="button" class="btn ghost block add-st" onclick="addStudent()">+ إضافة طالب</button>
  <div class="send-bar"><span class="muted small">${state.students.length} طالب، ${state.students.reduce((n, s) => n + s.slots.length, 0)} حصة في الأسبوع</span>
    <button class="btn" id="sendBtn" onclick="submitAll()">إرسال البيانات</button></div>`;
}

document.addEventListener('input', onEdit);
document.addEventListener('change', onEdit);
function onEdit(e) {
  const el = e.target, k = el.dataset && el.dataset.k;
  if (!k) return;
  if (el.type === 'radio' && !el.checked) return;
  const v = el.dataset.num !== undefined ? (el.value === '' ? '' : +el.value) : el.value;
  setPath(state, k, v);
  el.closest('.field')?.classList.remove('err');
  saveDraft();
  // تحديث الأجزاء المعتمدة على البلد (أسماء التوقيت)
  if (e.type === 'change' && (el.dataset.rerender !== undefined || /students\.\d+\.country$/.test(k))) { const y = scrollY; render(); scrollTo(0, y); }
}
function structural(fn) { fn(); saveDraft(); const y = scrollY; render(); scrollTo(0, y); }
function addStudent() { structural(() => state.students.push(newStudent(state.students.at(-1)?.country || state.teacher.country))); setTimeout(() => $(`#st${state.students.length - 1}`)?.scrollIntoView({ behavior: 'smooth' }), 50); }
function dupStudent(i) { structural(() => { const c = JSON.parse(JSON.stringify(state.students[i])); Object.assign(c, { name: '', parentName: '', parentPhone: '', notes: '', level: '' }); state.students.splice(i + 1, 0, c); }); }
function delStudent(i) { if (confirm('حذف هذا الطالب من القائمة؟')) structural(() => state.students.splice(i, 1)); }
function addSlot(i) { structural(() => { const l = state.students[i].slots.at(-1) || { day: 0, time: '17:00' }; state.students[i].slots.push({ day: (l.day + 2) % 7, time: l.time }); }); }
function delSlot(i, j) { structural(() => state.students[i].slots.splice(j, 1)); }

/* ---------- التحقق والإرسال ---------- */
function validate() {
  const errs = [], mark = k => { const el = $(`[data-k="${k}"]`); el?.closest('.field')?.classList.add('err'); errs.push(el); };
  const t = state.teacher, phoneOk = p => String(p).replace(/\D/g, '').length >= 8;
  if (!t.name.trim()) mark('teacher.name');
  if (!phoneOk(t.phone)) mark('teacher.phone');
  if (!t.supervisor.trim()) mark('teacher.supervisor');
  state.students.forEach((s, i) => {
    if (!s.name.trim()) mark(`students.${i}.name`);
    if (!phoneOk(s.parentPhone)) mark(`students.${i}.parentPhone`);
    if (!(+s.total >= 1)) mark(`students.${i}.total`);
    if (!(+s.remaining >= 0) || s.remaining === '') mark(`students.${i}.remaining`);
    else if (+s.remaining > +s.total) mark(`students.${i}.remaining`);
  });
  return errs.filter(Boolean);
}
async function submitAll() {
  const errs = validate();
  if (errs.length) { errs[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); return toast('راجع الحقول المعلّمة بالأحمر', true); }
  const btn = $('#sendBtn'); btn.disabled = true; btn.textContent = 'جارٍ الإرسال...';
  const id = uid();
  const clean = s => ({
    name: s.name.trim(), country: s.country, parentName: s.parentName.trim(), parentPhone: s.parentPhone.trim(),
    total: +s.total, remaining: +s.remaining, status: s.status, startDate: s.startDate || '',
    tzBase: s.tzBase === 'S' ? 'S' : 'T', duration: +s.duration || 30,
    slots: s.slots.filter(x => x.time).map(x => ({ day: +x.day, time: x.time })),
    level: s.level.trim(), link: s.link.trim(), notes: s.notes.trim(), groupName: (s.groupName || '').trim(),
  });
  const t = state.teacher;
  const doc = { id, createdAt: Date.now(), status: 'new', version: 1,
    teacher: { name: t.name.trim(), country: t.country, phone: t.phone.trim(), supervisor: t.supervisor.trim(), notes: t.notes.trim() },
    students: state.students.map(clean) };
  try {
    await F.fs.collection(P('intake')).doc(id).set(doc);
    clearDraft();
    sent = { name: doc.teacher.name, count: doc.students.length, ref: id.slice(-6).toUpperCase() };
    render(); scrollTo(0, 0);
  } catch (e) {
    console.error(e); btn.disabled = false; btn.textContent = 'إرسال البيانات';
    toast(e.code === 'permission-denied' ? 'تعذر الإرسال — تأكد من تحديث قواعد الحماية في Firebase' : 'تعذر الإرسال — تأكد من الاتصال بالإنترنت وحاول مرة أخرى', true);
  }
}

(() => {
  try { F = fbInit(); } catch (e) { if (e.message === 'config') return configMissingScreen(); $('#app').innerHTML = `<div class="note">${esc(e.message)}</div>`; return; }
  loadDraft(); render();
})();
