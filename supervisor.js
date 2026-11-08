/* ===================== Qraan — صفحة المشرفة ===================== */
'use strict';

const db = Store.db;
const S = db.settings;
let me = null;          // بيانات المشرفة
let current = 'teachers';
const lf = { teacher: '', month: '' };
const views = { teachers, lectures, evals };
const EVAL_GRADES = ['ممتاز', 'جيد جدًا', 'جيد', 'يحتاج تحسين'];

function go(tab) { current = tab; $$('#nav button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); render(); }
function render() {
  $('#main').innerHTML = views[current]();
  $('#sideFoot').innerHTML = `${esc(me.name)}<br><span class="small">مشرفة</span>`;
}
$$('#nav button[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));

const C = () => S.adminCountry || 'EG';
const monthNow = () => nowIn(C()).iso.slice(0, 7);
const lastEval = tid => db.teacherEvals.filter(e => e.teacherId === tid).sort((a, b) => b.createdAt - a.createdAt)[0];
function tInfo(t) {
  const st = teacherStats(t.id, t.country);
  const now = Date.now(), m = nowIn(t.country).iso.slice(0, 7);
  const missed = teacherSessions(t.id, t.country, 7, 0).filter(o => !o.rec && o.ts < now).length;
  const sts = db.students.filter(s => s.teacherId === t.id);
  const reps = db.reports.filter(r => r.teacherId === t.id).sort((a, b) => (b.sessionTs || b.createdAt) - (a.sessionTs || a.createdAt));
  const monthReps = reps.filter(r => repWhen(r, t.country).iso.startsWith(m));
  return { st, missed, sts, active: sts.filter(isActive).length, reps, monthReps,
    monthPresent: monthReps.filter(r => r.attendance === 'present').length, last: reps[0] };
}

/* =============== محفظيني =============== */
function teachers() {
  const list = db.teachers.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const infos = list.map(t => [t, tInfo(t)]);
  const tot = infos.reduce((o, [, i]) => ({ s: o.s + i.active, m: o.m + i.monthReps.length, x: o.x + i.missed }), { s: 0, m: 0, x: 0 });
  return `
  <div class="topbar"><h2>أهلًا ${esc(me.name)}</h2><span class="muted">${fmtDayDate(nowIn(C()).iso)}</span></div>
  <div class="stats">
    <div class="stat"><div class="n">${list.length}</div><div class="l">محفظ تحت إشرافك</div></div>
    <div class="stat"><div class="n">${tot.s}</div><div class="l">طالب نشط</div></div>
    <div class="stat gold"><div class="n">${tot.m}</div><div class="l">محاضرات هذا الشهر</div></div>
    <div class="stat ${tot.x ? 'warn' : ''}"><div class="n">${tot.x}</div><div class="l">محاضرات لم تُسجل (آخر 7 أيام)</div></div>
  </div>
  ${list.length ? `<div class="cards">${infos.map(([t, i]) => {
    const le = lastEval(t.id);
    return `<div class="scard">
      <div class="head"><div><div class="name">${esc(t.name)}</div><div class="muted small">${countryLabel(t.country)} · <span dir="ltr">${esc(t.phone || '—')}</span></div></div>
        ${i.missed ? `<span class="pill warn">${i.missed} لم تُسجل</span>` : '<span class="pill ok">منتظم</span>'}</div>
      <div class="kv"><span>طلاب نشطين</span><span><b>${i.active}</b> من ${i.sts.length}</span></div>
      <div class="kv"><span>محاضرات الشهر</span><span><b>${i.monthReps.length}</b> <span class="muted small">(حضر ${i.monthPresent})</span></span></div>
      <div class="kv"><span>آخر محاضرة</span><span class="small">${i.last ? (() => { const w = repWhen(i.last, t.country); return fmtDayDate(w.iso) + (w.time ? ' ' + fmtTime(w.time) : ''); })() : '—'}</span></div>
      <div class="kv"><span>آخر تقييم منك</span><span class="small">${le ? `${esc(le.grade)} · ${fmtDate(le.createdAt)}` : '—'}</span></div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn sm" style="flex:1" onclick="evalForm('${t.id}')">⭐ تقييم المحفظ</button>
        <button class="btn sm ghost" onclick="details('${t.id}')">التفاصيل</button>
        ${t.phone ? `<a class="btn sm wa" target="_blank" href="${waLink(normPhone(t.phone, t.country), `السلام عليكم أ/ ${t.name}`)}">💬</a>` : ''}
      </div></div>`;
  }).join('')}</div>` : '<div class="card empty">لم يتم ربط محفظين بك بعد — تواصلي مع الإدارة.</div>'}`;
}

function details(tid) {
  const t = Store.teacher(tid), i = tInfo(t);
  openModal(`${esc(t.name)}`, `
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat"><div class="n">${i.monthReps.length}</div><div class="l">محاضرات الشهر</div></div>
      <div class="stat"><div class="n">${i.monthPresent}</div><div class="l">حضر</div></div>
      <div class="stat ${i.missed ? 'warn' : ''}"><div class="n">${i.missed}</div><div class="l">لم تُسجل</div></div>
    </div>
    <h4 style="margin:6px 0">الطلاب (${i.sts.length})</h4>
    ${i.sts.length ? `<div class="table-wrap"><table><tr><th>الطالب</th><th>المتبقي</th><th>الحالة</th><th>المواعيد (بتوقيت المحفظ)</th></tr>
      ${i.sts.map(s => `<tr><td>${esc(s.name)}<div class="muted small">${countryLabel(s.country)}</div></td><td>${s.remaining}/${s.total}</td><td>${statusPill(s)}</td>
        <td class="small">${slotsIn(s, t.country).map(fmtSlot).join(' · ') || '—'}</td></tr>`).join('')}</table></div>` : '<div class="empty">لا يوجد طلاب</div>'}
    <h4 style="margin:12px 0 6px">آخر المحاضرات</h4>
    ${i.reps.length ? `<div class="table-wrap"><table><tr><th>التاريخ</th><th>الطالب</th><th>الحضور</th><th>التقييم</th></tr>
      ${i.reps.slice(0, 15).map(r => { const w = repWhen(r, t.country); return `<tr><td class="small">${fmtDayDate(w.iso)}${w.time ? ' ' + fmtTime(w.time) : ''}</td><td>${esc(Store.student(r.studentId)?.name || '—')}</td>
        <td>${r.attendance === 'present' ? '<span class="pill ok">حضر</span>' : '<span class="pill danger">لم يحضر</span>'}</td><td>${esc(r.grade || '—')}${r.notes ? `<div class="muted small">${esc(r.notes)}</div>` : ''}</td></tr>`; }).join('')}</table></div>` : '<div class="empty">لا توجد محاضرات مسجلة</div>'}`,
    `<button class="btn" onclick="closeModal();evalForm('${t.id}')">⭐ تقييم المحفظ</button><button class="btn ghost" onclick="closeModal()">إغلاق</button>`);
}

/* =============== تقييم المحفظ وإرساله على واتساب =============== */
function evalMessage(t, i, grade, notes) {
  return `السلام عليكم أ/ ${t.name}
تقييم المشرفة ${me.name} — ${monthNow()}
التقييم العام: ${grade}
• محاضرات الشهر: ${i.monthReps.length} (حضر ${i.monthPresent} · لم يحضر ${i.monthReps.length - i.monthPresent})
• محاضرات لم تُسجل: ${i.missed}
• طلاب نشطين: ${i.active}
${notes ? 'ملاحظات: ' + notes + '\n' : ''}${S.academy || ''}`;
}
function evalForm(tid) {
  const t = Store.teacher(tid), i = tInfo(t);
  openModal(`تقييم ${esc(t.name)}`, `
    <div class="note small">محاضرات الشهر: <b>${i.monthReps.length}</b> (حضر ${i.monthPresent}) · لم تُسجل: <b>${i.missed}</b> · طلاب نشطين: <b>${i.active}</b></div>
    <form id="evf">
      <div class="field"><label>التقييم العام</label>
        <div class="grades">${EVAL_GRADES.map((g, x) => `<label class="gr-opt"><input type="radio" name="grade" value="${g}" ${x === 0 ? 'checked' : ''}><span class="grade g${x}">${['🌟', '👍', '🙂', '📌'][x]} ${g}</span></label>`).join('')}</div></div>
      <div class="field"><label>ملاحظات للمحفظ</label><textarea name="notes" maxlength="400" placeholder="مثال: ممتاز في الالتزام بالمواعيد — برجاء تسجيل الحضور بعد كل حصة مباشرة"></textarea></div>
      <div class="msg-preview" id="evPrev"></div>
    </form>`,
    `<button class="btn wa" form="evf">حفظ وإرسال على واتساب</button><button class="btn ghost" type="button" id="evSave">حفظ فقط</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  const f = $('#evf'), prev = () => { const d = Object.fromEntries(new FormData(f)); $('#evPrev').textContent = evalMessage(t, i, d.grade, d.notes.trim()); };
  f.addEventListener('input', prev); f.addEventListener('change', prev); prev();
  const save = send => {
    const d = Object.fromEntries(new FormData(f)), notes = d.notes.trim(), text = evalMessage(t, i, d.grade, notes);
    db.teacherEvals.push({ id: uid(), teacherId: t.id, teacherName: t.name, supervisorId: me.id, supervisorUid: me.uid, supervisorName: me.name,
      grade: d.grade, notes, month: monthNow(), stats: { lectures: i.monthReps.length, present: i.monthPresent, missed: i.missed, active: i.active },
      createdAt: Date.now(), sent: !!send });
    Store.save();
    if (send) {
      const ph = normPhone(t.phone, t.country);
      if (ph) window.open(waLink(ph, text), '_blank'); else toast('رقم المحفظ غير مسجل — تم الحفظ فقط', true);
    }
    closeModal(); toast('تم حفظ التقييم'); render();
  };
  f.onsubmit = e => { e.preventDefault(); save(true); };
  $('#evSave').onclick = () => save(false);
}

/* =============== المحاضرات =============== */
function lectures() {
  if (!lf.month) lf.month = monthNow();
  const all = db.reports.map(r => { const t = Store.teacher(r.teacherId); return { r, t, w: repWhen(r, t?.country || C()) }; })
    .sort((a, b) => (b.r.sessionTs || b.r.createdAt) - (a.r.sessionTs || a.r.createdAt));
  const months = [...new Set([monthNow(), ...all.map(x => x.w.iso.slice(0, 7))])].sort().reverse();
  const list = all.filter(x => (!lf.teacher || x.r.teacherId === lf.teacher) && (lf.month === 'all' || x.w.iso.startsWith(lf.month)));
  const p = list.filter(x => x.r.attendance === 'present').length;
  return `
  <div class="topbar"><h2>محاضرات المحفظين</h2></div>
  <div class="toolbar">
    <select onchange="lf.month=this.value;render()">${months.map(m => `<option value="${m}" ${m === lf.month ? 'selected' : ''}>${m}</option>`).join('')}<option value="all" ${lf.month === 'all' ? 'selected' : ''}>كل الفترات</option></select>
    <select onchange="lf.teacher=this.value;render()"><option value="">كل المحفظين</option>${db.teachers.map(t => `<option value="${t.id}" ${t.id === lf.teacher ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
    <span class="muted" style="align-self:center">${list.length} محاضرة · حضر ${p} · لم يحضر ${list.length - p}</span>
  </div>
  ${list.length ? `<div class="table-wrap"><table><tr><th>اليوم والتاريخ</th><th>الوقت</th><th>المحفظ</th><th>الطالب</th><th>الحضور</th><th>التقييم</th></tr>
    ${list.slice(0, 400).map(({ r, t, w }) => `<tr><td>${fmtDayDate(w.iso)}</td><td>${w.time ? fmtTime(w.time) : '—'}</td><td>${esc(t?.name || '—')}</td><td>${esc(Store.student(r.studentId)?.name || '—')}</td>
      <td>${r.attendance === 'present' ? '<span class="pill ok">حضر</span>' : '<span class="pill danger">لم يحضر</span>'}</td>
      <td>${esc(r.grade || '—')}${r.notes ? `<div class="muted small">${esc(r.notes)}</div>` : ''}</td></tr>`).join('')}</table></div>` : '<div class="card empty">لا توجد محاضرات في هذه الفترة.</div>'}`;
}

/* =============== تقييماتي =============== */
function evals() {
  const list = db.teacherEvals.slice().sort((a, b) => b.createdAt - a.createdAt);
  return `
  <div class="topbar"><h2>تقييماتي (${list.length})</h2></div>
  ${list.length ? `<div class="table-wrap"><table><tr><th>التاريخ</th><th>المحفظ</th><th>التقييم</th><th>إحصائيات الشهر</th><th>ملاحظات</th><th>واتساب</th></tr>
    ${list.map(e => `<tr><td class="small">${fmtDateTime(e.createdAt)}</td><td>${esc(e.teacherName || Store.teacher(e.teacherId)?.name || '—')}</td><td><b>${esc(e.grade)}</b></td>
      <td class="small">${e.stats ? `${e.stats.lectures} محاضرة · لم تُسجل ${e.stats.missed}` : '—'}</td><td class="small">${esc(e.notes || '—')}</td>
      <td>${e.sent ? '<span class="pill ok">أُرسل</span>' : '<span class="pill gray">محفوظ</span>'}</td></tr>`).join('')}</table></div>` : '<div class="card empty">لم تسجلي تقييمات بعد — من «محفظيني» اضغطي «تقييم المحفظ».</div>'}`;
}

boot('supervisor').then(() => {
  const myId = db.supervisors[0].id;
  me = db.supervisors[0];
  Store.onChange = () => { me = Store.supervisor(myId); if (!me || me.active === false) return logout(); render(); };
  render();
});
