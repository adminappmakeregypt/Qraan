/* ===================== Qraan — صفحة المحفظ ===================== */
'use strict';

const db = Store.db;
const S = db.settings;
let me = null;   // المحفظ الحالي (بعد تحميل البيانات)

const OPEN_BEFORE = 30 * 60000;   // يمكن تسجيل الحضور قبل الموعد بنصف ساعة
const UNDO_WINDOW = 24 * 3600000; // يمكن التراجع خلال 24 ساعة
let current = 'schedule';
let histMonth = '';
const views = { schedule, students, history };

function go(tab) { current = tab; $$('#nav button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); render(); }
function render() {
  applyBrand();
  $('#main').innerHTML = views[current]();
  $('#sideFoot').innerHTML = `${esc(me.name)}<br>${countryLabel(me.country)}${me.supervisorId ? `<br>المشرفة: ${esc(supervisorName(me.supervisorId))}` : ''}`;
}
$$('#nav button[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
const myStudents = () => db.students.filter(s => s.teacherId === me.id);

/* =============== جدولي =============== */
function statsBar() {
  const t = teacherStats(me.id, me.country);
  const g = teacherReportStats(me.country, 'all').find(x => x.t.id === me.id) || { ready: 0 };
  return `<div class="stats">
    <div class="stat"><div class="n">${t.month}</div><div class="l">محاضرات هذا الشهر</div></div>
    <div class="stat gold"><div class="n">${t.total}</div><div class="l">إجمالي المحاضرات</div></div>
    <div class="stat"><div class="n">${t.present}</div><div class="l">حضر</div></div>
    <div class="stat danger"><div class="n">${t.absent}</div><div class="l">لم يحضر</div></div>
    <div class="stat warn"><div class="n">${g.ready}</div><div class="l">تقارير لسه ما اتبعتتش للجروب</div></div>
  </div>`;
}

function sessionRow(o) {
  const st = o.st, now = Date.now(), r = o.rec;
  const canRecord = !r && o.ts - now <= OPEN_BEFORE;
  const end = st.duration ? fmtTime(localOf(o.ts + st.duration * 60000, me.country).time) : '';
  const no = r ? r.lectureNo : st.total - st.remaining + 1 + countBefore(o);
  let actions;
  if (r) {
    actions = `<span class="pill ${r.attendance === 'present' ? 'ok' : 'danger'}">${r.attendance === 'present' ? '✅ حضر' : '❌ لم يحضر'}</span>
      ${r.attendance === 'present' ? repBtn(r) : ''}
      ${now - r.createdAt < UNDO_WINDOW && r.group?.status !== 'sent' ? `<button class="btn sm ghost" onclick="undo('${r.id}')">تراجع</button>` : ''}`;
  } else if (canRecord) {
    actions = `<button class="btn sm" onclick="reportModal('${o.key}')">✅ حضر + التقرير</button>
      <button class="btn sm danger" onclick="mark('${o.key}','absent')">❌ لم يحضر</button>`;
  } else {
    actions = `<span class="muted small">${inText(Math.round((o.ts - now) / 60000))}</span>`;
  }
  return `<div class="sess ${r ? 'done' : canRecord ? 'due' : ''}">
    <div class="sess-time"><b>${fmtTime(o.time)}</b>${end ? `<span class="muted small">حتى ${end}</span>` : ''}</div>
    <div class="sess-info">
      <div><b>${esc(st.name)}</b> <span class="muted small">${countryLabel(st.country)}${st.country !== me.country ? ` · عنده ${fmtTime(localOf(o.ts, st.country).time)}` : ''}</span></div>
      <div class="muted small">المحاضرة ${no} من ${st.total} · المتبقي ${st.remaining}${st.link ? ` · <a href="${esc(st.link)}" target="_blank" rel="noopener">رابط الحلقة ↗</a>` : ''}</div>
      ${st.notes ? `<div class="small">📌 ${esc(st.notes)}</div>` : ''}
    </div>
    <div class="sess-act">${actions}</div>
  </div>`;
}
/** ترتيب المحاضرة بين المحاضرات غير المسجلة السابقة لنفس الطالب */
let _occ = [];
function countBefore(o) { return _occ.filter(x => x.st.id === o.st.id && !x.rec && x.ts < o.ts).length; }

function schedule() {
  _occ = teacherSessions(me.id, me.country, 7, 7);
  const n = nowIn(me.country), now = Date.now();
  const missed = _occ.filter(o => !o.rec && o.date < n.iso);
  const today = _occ.filter(o => o.date === n.iso);
  const next = _occ.filter(o => o.date > n.iso);
  const byDay = {};
  next.forEach(o => (byDay[o.date] ||= []).push(o));
  const expired = myStudents().filter(s => !isActive(s));

  return `
  <div class="topbar"><h2>أهلًا ${esc(me.name)}</h2><span class="muted">${fmtDayDate(n.iso)} — بتوقيت ${countryLabel(me.country)}</span></div>
  ${statsBar()}
  ${missed.length ? `<div class="card"><h3>⚠️ محاضرات سابقة لم تُسجل (${missed.length})</h3>${missed.map(o => `<div class="muted small" style="margin-top:6px">${fmtDayDate(o.date)}</div>${sessionRow(o)}`).join('')}</div>` : ''}
  <div class="card"><h3>محاضرات اليوم</h3>
    ${today.length ? today.map(sessionRow).join('') : '<div class="empty">لا توجد محاضرات اليوم</div>'}
  </div>
  <div class="card"><h3>المحاضرات القادمة</h3>
    ${Object.keys(byDay).length ? Object.entries(byDay).map(([d, list]) => `<div class="day-head">${fmtDayDate(d)}</div>${list.map(sessionRow).join('')}`).join('') : '<div class="empty">لا توجد محاضرات قادمة</div>'}
  </div>
  ${expired.length ? `<div class="note">طلاب اشتراكهم منتهي (لا محاضرات لهم حتى التجديد): ${expired.map(s => esc(s.name)).join('، ')}</div>` : ''}`;
}

const repBtn = r => r.group?.status === 'sent' ? `<span class="pill ok">📤 اتبعت للجروب</span>`
  : r.group ? `<button class="btn sm ghost" onclick="editReport('${r.id}')">📝 تعديل التقرير</button>`
  : `<button class="btn sm gold" onclick="editReport('${r.id}')">📝 اكتب التقرير</button>`;

/** حضر → قالب تقرير الحصة → حفظ (يظهر للمشرفة جاهز للإرسال) */
function reportModal(key) {
  const o = _occ.find(x => x.key === key);
  if (!o) return toast('المحاضرة غير موجودة', true);
  const st = o.st, no = st.total - st.remaining + 1 + countBefore(o);
  openModal(`تقرير الحصة — ${esc(st.name)}`, reportFormHtml(st),
    `<button class="btn" onclick="saveNewReport('${key}')">💾 حفظ التقرير</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  bindReportPreview({ studentId: st.id, teacherId: me.id, lectureNo: no, date: o.date });
}
async function saveNewReport(key) {
  const o = _occ.find(x => x.key === key);
  if (!o) return toast('المحاضرة غير موجودة', true);
  const f = readReportForm();
  if (!f.newSura && !f.revSura) return toast('اكتب سورة الحفظ الجديد أو المراجعة على الأقل', true);
  try {
    const { msgs } = recordSession(o.st, me, o, 'present', f);
    closeModal(); render();
    if (!msgs.length) return toast('تم حفظ التقرير ✅ — جاهز للإرسال عند المشرفة');
    const r = await deliver(msgs[0]);
    toast(r === 'sent' ? 'تم حفظ التقرير — وآخر محاضرة في الباقة: اتبعت تذكير الاشتراك ✅'
      : 'تم حفظ التقرير — آخر محاضرة في الباقة، تم إبلاغ الإدارة', r === 'failed');
  } catch (err) { toast(err.message, true); }
}
function editReport(repId) {
  const r = db.reports.find(x => x.id === repId), st = Store.student(r?.studentId);
  if (!r || !st) return;
  if (r.group?.status === 'sent') return toast('التقرير اتبعت للجروب بالفعل', true);
  openModal(`تقرير الحصة — ${esc(st.name)}`, reportFormHtml(st, r.report || {}),
    `<button class="btn" onclick="saveEditReport('${r.id}')">💾 حفظ التقرير</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  bindReportPreview(r);
}
function saveEditReport(repId) {
  const r = db.reports.find(x => x.id === repId), f = readReportForm();
  if (!f.newSura && !f.revSura) return toast('اكتب سورة الحفظ الجديد أو المراجعة على الأقل', true);
  try { setGroupReport(r, f); closeModal(); toast('تم حفظ التقرير ✅'); render(); } catch (e) { toast(e.message, true); }
}

async function mark(key, attendance) {
  const o = _occ.find(x => x.key === key);
  if (!o) return toast('المحاضرة غير موجودة', true);
  if (attendance === 'absent' && !confirmBox(`تسجيل «لم يحضر» لـ ${o.st.name}؟`)) return;
  try {
    const { msgs } = recordSession(o.st, me, o, attendance);
    render();
    if (!msgs.length) return toast(`تم التسجيل: ${ATT[attendance]}`);
    const r = await deliver(msgs[0]);
    toast(r === 'sent' ? 'آخر محاضرة في الباقة — تم إرسال تذكير الاشتراك لولي الأمر ✅'
      : r === 'failed' ? 'آخر محاضرة — تعذر إرسال الواتساب، ستتابعه الإدارة' : 'آخر محاضرة في الباقة — تم إبلاغ الإدارة', r === 'failed');
  } catch (err) { toast(err.message, true); }
}
function undo(repId) {
  if (db.reports.find(x => x.id === repId)?.group?.status === 'sent') return toast('التقرير اتبعت للجروب — كلّم الإدارة للتعديل', true);
  if (!confirmBox('إلغاء تسجيل هذه المحاضرة وتقريرها؟')) return;
  undoSession(repId); toast('تم الإلغاء'); render();
}

/* =============== طلابي =============== */
function students() {
  const list = myStudents();
  return `
  <div class="topbar"><h2>طلابي (${list.length})</h2><span class="muted">المواعيد بتوقيت ${countryLabel(me.country)}</span></div>
  ${list.length ? `<div class="cards">${list.map(s => {
    const active = isActive(s), nx = nextSession(s, me.country), done = db.reports.filter(r => r.studentId === s.id && r.teacherId === me.id).length;
    return `<div class="scard ${active ? '' : 'expired'}">
      <div class="head"><div><div class="name">${esc(s.name)}</div><div class="muted small">${countryLabel(s.country)}</div></div>${statusPill(s)}</div>
      <div class="kv"><span>الجروب</span><span>${esc(s.groupName || '—')}</span></div>
      <div class="kv"><span>المحاضرات المتبقية</span><span><b>${s.remaining}</b> / ${s.total}</span></div>
      <div class="kv"><span>سجّلت له</span><span>${done} محاضرة</span></div>
      <div class="kv"><span>حضر / لم يحضر</span><span>✅ ${s.attended || 0} · ❌ ${(s.absent || 0) + (s.excused || 0)}</span></div>
      ${active ? `<div class="kv"><span>القادمة</span><span>${nx ? fmtSlot(nx) : '—'}</span></div>
        <div class="list-slots muted">${slotsIn(s, me.country).map(fmtSlot).join(' · ') || 'لا مواعيد'}</div>`
      : '<div class="note small" style="margin:0">انتهت الباقة — بانتظار التجديد من الإدارة.</div>'}
      ${s.link ? `<a class="btn ghost sm" href="${esc(s.link)}" target="_blank" rel="noopener">رابط الحلقة ↗</a>` : ''}
    </div>`;
  }).join('')}</div>` : '<div class="card empty">لم يتم تعيين طلاب لك بعد.</div>'}`;
}

/* =============== سجل محاضراتي =============== */
function history() {
  const all = db.reports.filter(r => r.teacherId === me.id).sort((a, b) => (b.sessionTs || b.createdAt) - (a.sessionTs || a.createdAt));
  const months = [...new Set(all.map(r => repWhen(r, me.country).iso.slice(0, 7)))];
  const reps = histMonth ? all.filter(r => repWhen(r, me.country).iso.startsWith(histMonth)) : all;
  return `
  <div class="topbar"><h2>سجل محاضراتي</h2></div>
  ${statsBar()}
  <div class="toolbar"><select onchange="histMonth=this.value;render()"><option value="">كل الشهور</option>
    ${months.map(m => `<option value="${m}" ${m === histMonth ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <span class="muted" style="align-self:center">${reps.length} محاضرة</span></div>
  ${reps.length ? `<div class="table-wrap"><table><tr><th>#</th><th>اليوم والتاريخ</th><th>الوقت</th><th>الطالب</th><th>الحضور</th><th>رقم المحاضرة</th><th>المتبقي بعدها</th><th>تقرير الجروب</th></tr>
    ${reps.map((r, i) => { const w = repWhen(r, me.country); return `<tr><td>${reps.length - i}</td><td>${fmtDayDate(w.iso)}</td><td>${w.time ? fmtTime(w.time) : '—'}</td>
      <td>${esc(Store.student(r.studentId)?.name || '—')}</td><td>${r.attendance === 'present' ? '<span class="pill ok">حضر</span>' : '<span class="pill danger">لم يحضر</span>'}</td>
      <td>${r.lectureNo || '—'}</td><td>${r.remainingAfter}</td><td>${r.attendance === 'present' ? repBtn(r) : '—'}</td></tr>`; }).join('')}
  </table></div>` : '<div class="card empty">لم تسجل محاضرات بعد.</div>'}`;
}

boot('teacher').then(p => {
  me = Store.teacher(p.id);
  window.WHO = { role: 'teacher', id: me.id, name: me.name };
  const editing = () => $('#modal') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  let pend = false;
  Store.onChange = () => {
    if (me.active === false || !Store.teacher(me.id)) { alert('تم إيقاف الحساب — تواصل مع الإدارة'); return logout(); }
    if (editing()) pend = true; else render();
  };
  render();
  setInterval(() => { if (!editing() && current === 'schedule') render(); }, 60000); // تحديث الأزرار كل دقيقة
  setInterval(() => { if (pend && !editing()) { pend = false; render(); } }, 1500);
}).catch(() => {});
