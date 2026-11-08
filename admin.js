/* ===================== Qraan — لوحة المدير / المشرفة ===================== */
'use strict';

// نفس اللوحة للمدير وللمشرفة — المشرفة تشوف وتعدل المحفظين والطلاب التابعين لها بس
const db = Store.db;
const S = db.settings;
const IS_SUP = location.pathname.endsWith('supervisor.html');
let ME = null;   // المشرفة الحالية (بعد تحميل البيانات)
/** المحفظين والطلاب الظاهرين (للمشرفة: التابعين لها فقط) */
const VT = () => IS_SUP ? db.teachers.filter(t => t.supervisorId === ME.id) : db.teachers;
const VS = () => IS_SUP ? db.students.filter(s => effSupervisorId(s) === ME.id) : db.students;
const ADMIN_ONLY = ['supervisors', 'outbox', 'settings'];
let current = IS_SUP ? 'groups' : 'dashboard';
const filters = { teacher: '', sup: '', status: '', country: '', q: '' };

const grpScope = r => !IS_SUP || effSupervisorId(Store.student(r.studentId)) === ME.id;
const views = { dashboard, assign, teachers, supervisors, students, schedule, reports, groups: () => groupReportsView(S.adminCountry, IS_SUP ? grpScope : null), outbox, settings };
if (IS_SUP) {
  $$('#nav button[data-tab]').forEach(b => { if (ADMIN_ONLY.includes(b.dataset.tab)) b.remove(); });
  $$('#nav button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === current));
}
const editing = () => $('#modal') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

function go(tab) {
  if (IS_SUP && ADMIN_ONLY.includes(tab)) return;
  current = tab;
  $$('#nav button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}
function render() {
  applyBrand();
  $('#main').innerHTML = views[current]();
  const pending = db.outbox.filter(m => m.status === 'pending').length;
  $('#outBadge')?.classList.toggle('hidden', !pending); if ($('#outBadge')) $('#outBadge').textContent = pending;
  const gr = groupReports().filter(r => grpScope(r) && r.group.status !== 'sent').length;
  $('#grpBadge').textContent = gr; $('#grpBadge').classList.toggle('hidden', !gr);
  $('#sideFoot').innerHTML = IS_SUP ? `${esc(ME.name)}<br>${esc(S.academy)}` : `${esc(S.academy)}<br><span dir="ltr">${esc(Store.profile?.email || '')}</span>`;
}
$$('#nav button[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
const teacherName = id => esc(Store.teacher(id)?.name || '— بدون محفظ —');
const teacherOptions = (sel, withEmpty = true) =>
  (withEmpty ? '<option value="">— اختر —</option>' : '') +
  VT().map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('');

/* =============== الرئيسية =============== */
function dashboard() {
  const active = VS().filter(isActive);
  const expired = VS().filter(s => !isActive(s));
  const low = active.filter(s => s.remaining <= 2);
  const todayIso = nowIn(S.adminCountry).iso;
  const todayReports = db.reports.filter(r => (!IS_SUP || VT().some(t => t.id === r.teacherId)) && repWhen(r, S.adminCountry).iso === todayIso);
  const pending = db.outbox.filter(m => m.status === 'pending');

  // حلقات اليوم بتوقيت المدير
  const n = nowIn(S.adminCountry);
  const today = VT().flatMap(t => teacherSessions(t.id, S.adminCountry, 0, 0)).sort((a, b) => a.ts - b.ts);

  return `
  <div class="topbar"><h2>السلام عليكم 👋</h2><span class="muted">${DAYS[n.day]} — التوقيت: ${countryLabel(S.adminCountry)}</span></div>
  <div class="stats">
    <div class="stat"><div class="n">${VT().length}</div><div class="l">محفظ</div></div>
    <div class="stat"><div class="n">${active.length}</div><div class="l">طالب اشتراكه مدفوع</div></div>
    <div class="stat danger"><div class="n">${expired.length}</div><div class="l">اشتراك منتهي</div></div>
    <div class="stat warn"><div class="n">${low.length}</div><div class="l">قارب على الانتهاء (≤ 2)</div></div>
    <div class="stat gold clickable" onclick="go('reports')"><div class="n">${todayReports.length}</div><div class="l">محاضرات سُجلت اليوم ←</div></div>
    ${IS_SUP ? '' : `<div class="stat"><div class="n">${pending.length}</div><div class="l">رسائل في انتظار الإرسال</div></div>`}
    <div class="stat warn clickable" onclick="grp.tab='ready';go('groups')"><div class="n">${groupReports().filter(r => grpScope(r) && r.group.status !== 'sent').length}</div><div class="l">تقارير جاهزة للجروبات ←</div></div>
  </div>
  <div class="row">
    <div class="card"><h3>حلقات اليوم (بتوقيتك)</h3>
      ${today.length ? `<div class="table-wrap"><table><tr><th>الوقت</th><th>الطالب</th><th>المحفظ</th><th>الحالة</th></tr>
        ${today.map(x => `<tr><td>${fmtTime(x.time)}</td><td>${esc(x.st.name)}</td><td>${teacherName(x.st.teacherId)}</td>
          <td>${x.rec ? (x.rec.attendance === 'present' ? '<span class="pill ok">حضر</span>' : '<span class="pill danger">لم يحضر</span>') : (x.ts < Date.now() ? '<span class="pill warn">لم تُسجل</span>' : '<span class="pill gray">قادمة</span>')}</td></tr>`).join('')}
      </table></div>` : '<div class="empty">لا توجد حلقات اليوم</div>'}
    </div>
    <div class="card"><h3>اشتراكات تحتاج متابعة</h3>
      ${[...expired, ...low].length ? `<div class="table-wrap"><table><tr><th>الطالب</th><th>المتبقي</th><th>الحالة</th><th></th></tr>
        ${[...expired, ...low].map(s => `<tr><td>${esc(s.name)}<div class="muted small">${teacherName(s.teacherId)}</div></td><td>${s.remaining}</td><td>${statusPill(s)}</td>
          <td>${IS_SUP ? '' : `<button class="btn sm gold" onclick="renewForm('${s.id}')">تجديد</button>`}</td></tr>`).join('')}
      </table></div>` : '<div class="empty">كل الاشتراكات سليمة ✅</div>'}
    </div>
  </div>`;
}

/* =============== الجدول والحصص =============== */
const asg = { teacher: '', tz: '', q: '' };
const tzBaseOptions = (st, t) => [
  ['T', `توقيت المحفظ (${COUNTRIES[t.country].name})`], ['S', `توقيت الطالب (${COUNTRIES[st.country].name})`], ['A', `توقيتي (${COUNTRIES[S.adminCountry].name})`],
].map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
const baseCountry = (k, st, t) => k === 'S' ? st.country : k === 'A' ? S.adminCountry : t.country;

function teacherList(sel, onPick) {
  const q = asg.q.trim().toLowerCase();
  const list = VT().filter(t => !q || (t.name + ' ' + t.username).toLowerCase().includes(q));
  return `<aside class="tlist">
    <input placeholder="🔍 ابحث عن محفظ (${VT().length})" value="${esc(asg.q)}" oninput="asg.q=this.value;refreshTList()">
    <div class="tlist-items" id="tlistItems">${list.map(t => {
      const act = db.students.filter(s => s.teacherId === t.id && isActive(s)).length;
      return `<button class="${t.id === sel ? 'active' : ''}" onclick="${onPick}('${t.id}')"><b>${esc(t.name)}</b><span>${COUNTRIES[t.country].flag} ${act} طالب</span></button>`;
    }).join('') || '<div class="empty small">لا نتائج</div>'}</div></aside>`;
}
function refreshTList() {
  const box = $('#tlistItems'); if (!box) return;
  const tmp = document.createElement('div'); tmp.innerHTML = teacherList(asg.teacher, current === 'assign' ? 'pickAssign' : 'pickLec');
  box.innerHTML = $('#tlistItems', tmp).innerHTML;
}
function pickAssign(id) { asg.teacher = id; asg.tz = ''; render(); }

function assign() {
  if (!VT().length) return '<div class="topbar"><h2>الجدول والحصص</h2></div><div class="card empty">أضف محفظًا أولًا من صفحة المحفظين.</div>';
  if (!VT().some(t => t.id === asg.teacher)) asg.teacher = VT()[0].id;
  const t = Store.teacher(asg.teacher), view = asg.tz || t.country;
  const sts = db.students.filter(s => s.teacherId === t.id);
  const stt = teacherStats(t.id, S.adminCountry);
  const weekly = sts.filter(isActive).reduce((n, s) => n + (s.slots || []).length, 0);
  const now = Date.now();
  const days = DAYS.map(() => []);
  sts.forEach(st => (st.slots || []).forEach((s, i) => { const x = convertSlot(s, st.country, view); days[x.day].push({ st, x, i }); }));
  days.forEach(d => d.sort((a, b) => slotMin(a.x) - slotMin(b.x)));
  const nd = nowIn(view).day;

  return `
  <div class="topbar"><h2>الجدول والحصص</h2><span class="muted small">اضغط + في أي يوم لإضافة حصة، أو اضغط على الحصة لتعديلها</span></div>
  <div class="split">
    ${teacherList(t.id, 'pickAssign')}
    <div style="min-width:0">
      <div class="card" style="padding:14px 18px">
        <div class="topbar" style="margin:0"><div><h3 style="margin:0">${esc(t.name)}</h3><span class="muted small">${countryLabel(t.country)} · ${sts.filter(isActive).length} طالب نشط · ${weekly} حصة أسبوعيًا · ${stt.month} محاضرة هذا الشهر</span></div>
          <select style="width:auto" onchange="asg.tz=this.value;render()">${Object.entries(COUNTRIES).map(([k, c]) => `<option value="${k}" ${k === view ? 'selected' : ''}>عرض بتوقيت ${c.name}</option>`).join('')}</select></div>
      </div>
      <div class="week">${days.map((list, i) => `<div class="day ${i === nd ? 'today' : ''}"><h4>${DAYS[i]}</h4>
        ${list.map(({ st, x, i: idx }) => `<button class="slot slot-btn ${isActive(st) ? '' : 'off'}" onclick="sessionModal('${t.id}',${i},'${st.id}',${idx})" title="تعديل">
          <b>${fmtTime(x.time)}</b>${esc(st.name)}<div class="muted small">${COUNTRIES[st.country].flag} ${st.duration || 30} د${isActive(st) ? '' : ' · منتهي'}</div></button>`).join('')}
        <button class="add-slot" onclick="sessionModal('${t.id}',${i})">+ حصة</button>
      </div>`).join('')}</div>

      <div class="card" style="margin-top:16px">
        <div class="topbar" style="margin-bottom:10px"><h3 style="margin:0">طلاب ${esc(t.name)} (${sts.length})</h3>
          <button class="btn sm ghost" onclick="moveStudentForm('${t.id}')">+ تعيين طالب حالي</button></div>
        ${sts.length ? `<div class="table-wrap"><table>
          <tr><th>الطالب</th><th>الباقة</th><th>محاضرات إضافية</th><th></th></tr>
          ${sts.map(st => {
            const ex = (st.extra || []).filter(e => e.ts > now - 86400000).sort((a, b) => a.ts - b.ts);
            return `<tr>
            <td><b>${esc(st.name)}</b><div class="muted small">${countryLabel(st.country)} · ${(st.slots || []).length} حصة/أسبوع</div></td>
            <td>${meter(st)}<div style="margin-top:4px">${statusPill(st)}</div></td>
            <td><div class="chips">${ex.map(e => { const l = localOf(e.ts, t.country);
              return `<span class="chip gold">${DAYS[l.day]} ${l.iso.slice(5)} · ${fmtTime(l.time)}<button title="حذف" onclick="removeExtra('${st.id}','${e.id}')">×</button></span>`; }).join('') || '<span class="muted small">—</span>'}</div></td>
            <td><div class="actions">
              <button class="btn sm ghost" onclick="addExtraForm('${st.id}')">+ محاضرة مرة واحدة</button>
              <button class="btn sm gold" onclick="topUpForm('${st.id}')">+ محاضرات للباقة</button>
              <button class="btn sm ghost" onclick="studentForm('${st.id}')">تعديل</button>
              <button class="btn sm ghost" onclick="moveStudentForm('', '${st.id}')">نقل</button>
            </div></td></tr>`;
          }).join('')}
        </table></div>` : '<div class="empty">لا يوجد طلاب — اضغط «+ حصة» في الجدول لإضافة أول طالب.</div>'}
      </div>
    </div>
  </div>`;
}

/** نافذة إضافة/تعديل حصة أسبوعية من الجدول */
function sessionModal(teacherId, day, studentId, slotIdx) {
  const t = Store.teacher(teacherId), editing = studentId != null && slotIdx != null;
  const st0 = studentId ? Store.student(studentId) : null;
  const mine = db.students.filter(s => s.teacherId === teacherId), others = VS().filter(s => s.teacherId !== teacherId);
  const cur = editing ? convertSlot(st0.slots[slotIdx], st0.country, t.country) : { day, time: '17:00' };
  openModal(editing ? `تعديل حصة — ${esc(st0.name)}` : `حصة جديدة — ${esc(t.name)}`, `
    <form id="smf">
      <div class="field"><label>الطالب</label>
        <select name="sid" ${editing ? 'disabled' : ''}>
          ${mine.length ? `<optgroup label="طلاب المحفظ">${mine.map(s => `<option value="${s.id}" ${s.id === studentId ? 'selected' : ''}>${esc(s.name)} — متبقي ${s.remaining}</option>`).join('')}</optgroup>` : ''}
          <option value="__new" ${!editing && !mine.length ? 'selected' : ''}>➕ طالب جديد</option>
          ${others.length ? `<optgroup label="طلاب آخرين (سيتم نقلهم لهذا المحفظ)">${others.map(s => `<option value="${s.id}">${esc(s.name)} — ${s.teacherId ? teacherName(s.teacherId) : 'بدون محفظ'}</option>`).join('')}</optgroup>` : ''}
        </select></div>
      <div id="newSt" class="newst">
        <div class="row"><div class="field"><label>اسم الطالب</label><input name="nname"></div>
          <div class="field"><label>بلد الطالب</label><select name="ncountry">${countryOptions(t.country)}</select></div></div>
        <div class="row"><div class="field"><label>واتساب ولي الأمر</label><input name="nphone" dir="ltr"></div>
          <div class="field"><label>اسم ولي الأمر</label><input name="nparent"></div></div>
        <div class="field"><label>اسم جروب واتساب</label><input name="ngroup" placeholder="مثال: قرآن | أحمد محمد"></div>
        <div class="row"><div class="field"><label>عدد محاضرات الباقة</label><input name="ntotal" type="number" min="1" value="${S.defaultLectures}"></div>
          <div class="field"><label>مدة الحصة (دقيقة)</label><input name="ndur" type="number" min="10" step="5" value="30"></div></div>
      </div>
      <div class="row3">
        <div class="field"><label>اليوم</label><select name="day">${DAYS.map((d, i) => `<option value="${i}" ${i === cur.day ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label>الساعة</label><input type="time" name="time" value="${cur.time}" required></div>
        <div class="field"><label>بأي توقيت؟</label><select name="base"></select></div>
      </div>
      <div id="smPrev"></div>
    </form>`,
    `<button class="btn" form="smf">${editing ? 'حفظ التعديل' : 'إضافة الحصة'}</button>
     ${editing ? `<button class="btn danger" type="button" id="smDel">حذف الحصة</button>` : ''}
     <button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  const f = $('#smf');
  const getSt = () => {
    const v = editing ? studentId : f.sid.value;
    if (v === '__new') return { id: null, country: f.ncountry.value, duration: +f.ndur.value || 30, name: f.nname.value };
    return Store.student(v);
  };
  let lastBaseSt = '';
  const upd = () => {
    const st = getSt(), isNew = !st.id;
    $('#newSt').classList.toggle('hidden', !isNew);
    const sig = st.id + st.country;
    if (sig !== lastBaseSt) { const keep = f.base.value || 'T'; f.base.innerHTML = tzBaseOptions(st, t); f.base.value = keep; lastBaseSt = sig; }
    $('#smPrev').innerHTML = tzPreview(st, t, f.day.value, f.time.value, f.base.value, false, editing ? studentId : null).html;
  };
  f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
  if (editing) $('#smDel').onclick = () => {
    if (!confirmBox('حذف هذه الحصة الأسبوعية؟')) return;
    st0.slots.splice(slotIdx, 1); Store.save(); closeModal(); toast('تم الحذف'); render();
  };
  f.onsubmit = e => {
    e.preventDefault();
    let st = getSt();
    if (!st.id) {
      if (!f.nname.value.trim() || !f.nphone.value.trim()) return toast('اكتب اسم الطالب ورقم ولي الأمر', true);
      const n = Math.max(1, +f.ntotal.value || S.defaultLectures);
      st = { id: uid(), createdAt: Date.now(), name: f.nname.value.trim(), parentName: f.nparent.value.trim(), parentPhone: f.nphone.value.trim(),
        country: f.ncountry.value, teacherId: t.id, total: n, remaining: n, status: 'paid', attended: 0, absent: 0, excused: 0, renewals: [],
        notes: '', link: '', duration: Math.max(10, +f.ndur.value || 30), slots: [], groupName: f.ngroup.value.trim() };
      db.students.push(st);
    } else if (st.teacherId !== t.id) st.teacherId = t.id;
    const p = tzPreview(st, t, f.day.value, f.time.value, f.base.value, false, null);
    const ns = convertSlot(p.slot, p.bc, st.country);
    if ((st.slots || []).some((s, i) => s.day === ns.day && s.time === ns.time && i !== slotIdx)) return toast('هذا الموعد موجود بالفعل', true);
    if (editing) st.slots[slotIdx] = { day: ns.day, time: ns.time, since: Date.now() };
    else (st.slots ||= []).push({ day: ns.day, time: ns.time, since: Date.now() });
    Store.save();
    closeModal(); toast(editing ? 'تم التعديل' : 'تمت إضافة الحصة'); render();
  };
}

function tzPreview(st, t, day, time, baseKey, isDate, exceptSt = null) {
  const bc = baseCountry(baseKey, st, t);
  let ts, slot;
  if (isDate) { if (!day || !time) return { html: '' }; ts = occTs(day, time, bc); }
  else { if (!time) return { html: '' }; slot = { day: +day, time }; }
  const show = c => isDate ? (() => { const l = localOf(ts, c); return `${DAYS[l.day]} ${l.iso} ${fmtTime(l.time)}`; })() : fmtSlot(convertSlot(slot, bc, c));
  const rows = [[t.country, 'المحفظ'], [st.country, 'الطالب'], [S.adminCountry, 'أنت']]
    .filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i)
    .map(([c, who]) => `<b>${who} (${COUNTRIES[c].flag} ${COUNTRIES[c].name}):</b> ${show(c)}`);
  const conf = isDate
    ? slotConflicts(t.id, (() => { const l = localOf(ts, t.country); return { day: l.day, time: l.time }; })(), t.country, st.duration || 30, exceptSt)
    : slotConflicts(t.id, slot, bc, st.duration || 30, exceptSt);
  return { ts, slot, bc, html: `<div class="note small">${rows.join('<br>')}</div>${conf.length ? `<div class="note small" style="background:var(--danger-soft);border-color:#f0c9c4">⚠️ تعارض مع: ${conf.map(esc).join('، ')}</div>` : ''}` };
}

function addExtraForm(id) {
  const st = Store.student(id), t = Store.teacher(st.teacherId);
  if (!t) return toast('عيّن محفظًا للطالب أولًا', true);
  const today = nowIn(t.country).iso;
  openModal(`محاضرة إضافية (مرة واحدة) — ${esc(st.name)}`, `
    <form id="aef">
      <div class="row3">
        <div class="field"><label>التاريخ</label><input type="date" name="date" min="${addDaysIso(today, -7)}" value="${today}" required></div>
        <div class="field"><label>الساعة</label><input type="time" name="time" value="17:00" required></div>
        <div class="field"><label>بأي توقيت؟</label><select name="base">${tzBaseOptions(st, t)}</select></div>
      </div>
      <div id="aefPrev"></div>
      <div class="field"><label><input type="checkbox" name="addOne" style="width:auto" ${st.remaining <= 0 ? 'checked' : ''}> إضافة محاضرة لرصيد الباقة أيضًا (محاضرة مدفوعة زيادة)</label>
        <p class="muted small" style="margin:2px 0 0">لو غير مُفعّل، المحاضرة تُخصم من الرصيد الحالي (${st.remaining} متبقية) — مثل محاضرة تعويضية.</p></div>
    </form>`,
    `<button class="btn" form="aef">إضافة المحاضرة</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  const f = $('#aef'), upd = () => { $('#aefPrev').innerHTML = tzPreview(st, t, f.date.value, f.time.value, f.base.value, true).html; };
  f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
  f.onsubmit = e => {
    e.preventDefault();
    const p = tzPreview(st, t, f.date.value, f.time.value, f.base.value, true);
    if ((st.extra || []).some(x => x.ts === p.ts)) return toast('هذه المحاضرة موجودة بالفعل', true);
    if (f.addOne.checked) topUpStudent(st, 1);
    if (!isActive(st)) return toast('رصيد الطالب صفر — فعّل «إضافة محاضرة لرصيد الباقة» أو جدد الاشتراك', true);
    (st.extra ||= []).push({ id: uid(), ts: p.ts, createdAt: Date.now() });
    Store.save();
    closeModal(); toast('تمت إضافة المحاضرة'); render();
  };
}

function topUpForm(id) {
  const st = Store.student(id);
  openModal(`إضافة محاضرات للباقة — ${esc(st.name)}`, `
    <form id="tuf">
      <p class="muted">الرصيد الحالي: <b>${st.remaining}</b> من ${st.total} — ${statusPill(st)}</p>
      <div class="field"><label>عدد المحاضرات المضافة</label><input name="n" type="number" min="1" value="4" required></div>
      <p class="muted small">تُضاف للرصيد الحالي بدون تصفيره. (لبدء باقة جديدة استخدم «تجديد» من صفحة الطلاب)</p>
    </form>`,
    `<button class="btn gold" form="tuf">إضافة</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  $('#tuf').onsubmit = e => { e.preventDefault(); topUpStudent(st, e.target.n.value); closeModal(); toast('تمت الإضافة'); render(); };
}

function moveStudentForm(toTeacher, studentId) {
  const st = studentId ? Store.student(studentId) : null;
  const candidates = VS().filter(s => s.teacherId !== toTeacher);
  openModal(st ? `نقل ${esc(st.name)} لمحفظ آخر` : 'تعيين طالب حالي لهذا المحفظ', `
    <form id="mvf">
      ${st ? '' : `<div class="field"><label>الطالب</label><select name="sid" required><option value="">— اختر —</option>
        ${candidates.map(s => `<option value="${s.id}">${esc(s.name)} — ${s.teacherId ? 'حاليًا مع ' + teacherName(s.teacherId) : 'بدون محفظ'}</option>`).join('')}</select></div>`}
      <div class="field"><label>المحفظ الجديد</label><select name="tid" required>${VT().filter(x => !st || x.id !== st.teacherId).map(x => `<option value="${x.id}" ${x.id === toTeacher ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <p class="muted small">المحاضرات المسجلة سابقًا تبقى في سجل المحفظ القديم. المواعيد تنتقل كما هي.</p>
    </form>`,
    `<button class="btn" form="mvf">حفظ</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  $('#mvf').onsubmit = e => {
    e.preventDefault();
    const s2 = st || Store.student(e.target.sid.value);
    if (!s2) return toast('اختر الطالب', true);
    s2.teacherId = e.target.tid.value; Store.save();
    asg.teacher = s2.teacherId; closeModal(); toast('تم'); render();
  };
}
function removeSlot(id, i) {
  const st = Store.student(id);
  if (!confirmBox('حذف هذا الموعد الأسبوعي؟')) return;
  st.slots.splice(i, 1); Store.save(); render();
}
function removeExtra(id, eid) {
  const st = Store.student(id);
  if (!confirmBox('حذف هذه المحاضرة الإضافية؟')) return;
  st.extra = (st.extra || []).filter(e => e.id !== eid); Store.save(); render();
}

/* =============== المحفظين =============== */
function teachers() {
  return `
  <div class="topbar"><h2>المحفظين</h2><button class="btn" onclick="teacherForm()">+ إضافة محفظ</button></div>
  ${VT().length ? `<div class="table-wrap"><table>
    <tr><th>الاسم</th><th>المشرفة</th><th>اسم المستخدم</th><th>رقم الدخول</th><th>البلد</th><th>الهاتف</th><th>الطلاب</th><th>محاضرات الشهر</th><th>إجمالي المحاضرات</th><th>الحالة</th><th></th></tr>
    ${VT().map(t => {
      const sts = db.students.filter(s => s.teacherId === t.id), ts = teacherStats(t.id, S.adminCountry);
      return `<tr><td><b>${esc(t.name)}</b></td><td>${t.supervisorId ? esc(supervisorName(t.supervisorId)) : '<span class="pill warn">بدون مشرفة</span>'}</td><td dir="ltr" style="text-align:right">${esc(t.username)}</td><td><code>${esc(t.code)}</code></td>
      <td>${countryLabel(t.country)}</td><td dir="ltr" style="text-align:right">${esc(t.phone || '—')}</td>
      <td>${sts.filter(isActive).length} نشط / ${sts.length}</td>
      <td><b>${ts.month}</b></td><td>${ts.total} <span class="muted small">(✅ ${ts.present} · ❌ ${ts.absent})</span></td>
      <td>${t.active === false ? '<span class="pill gray">موقوف</span>' : '<span class="pill ok">فعال</span>'}</td>
      <td><div class="actions">
        <button class="btn sm ghost" onclick="teacherForm('${t.id}')">تعديل</button>
        <button class="btn sm ghost" onclick="filters.teacher='${t.id}';go('students')">طلابه</button>
        <button class="btn sm ghost" onclick="lec.teacher='${t.id}';go('reports')">محاضراته</button>
        <button class="btn sm" onclick="asg.teacher='${t.id}';go('assign')">الجدول</button>
        ${IS_SUP ? '' : `<button class="btn sm danger" onclick="delTeacher('${t.id}')">حذف</button>`}</div></td></tr>`;
    }).join('')}
  </table></div>` : '<div class="card empty">لا يوجد محفظين بعد — ابدأ بإضافة أول محفظ.</div>'}`;
}

function teacherForm(id, presetSup) {
  const t = id ? Store.teacher(id) : { name: '', username: '', code: String(Math.floor(1000 + Math.random() * 9000)), country: 'EG', phone: '', active: true, supervisorId: presetSup || (IS_SUP ? ME.id : '') };
  openModal(id ? 'تعديل محفظ' : 'إضافة محفظ', `
    <form id="tf">
      <div class="field"><label>الاسم</label><input name="name" required value="${esc(t.name)}"></div>
      <div class="row">
        <div class="field"><label>اسم المستخدم (للدخول)</label><input name="username" required dir="ltr" value="${esc(t.username)}" ${t.uid ? 'readonly title="لا يمكن تغييره بعد إنشاء الحساب"' : ''}></div>
        <div class="field"><label>رقم الدخول (بدون كلمة سر)</label><input name="code" required inputmode="numeric" pattern="[0-9]{3,10}" value="${esc(t.code)}"></div>
      </div>
      <div class="row">
        <div class="field"><label>البلد</label><select name="country">${countryOptions(t.country)}</select></div>
        <div class="field"><label>الهاتف</label><input name="phone" value="${esc(t.phone)}"></div>
      </div>
      <div class="field ${IS_SUP ? 'hidden' : ''}"><label>المشرفة</label><select name="supervisorId">${IS_SUP ? `<option value="${ME.id}" selected>${esc(ME.name)}</option>` : supervisorOptions(t.supervisorId)}</select>
        <p class="muted small" style="margin:2px 0 0">كل طلاب المحفظ بيتبعوا مشرفته تلقائيًا (إلا لو طالب له مشرفة مختلفة).</p></div>
      <div class="field"><label><input type="checkbox" name="active" style="width:auto" ${t.active !== false ? 'checked' : ''}> الحساب فعال</label></div>
    </form>`,
    `<button class="btn" form="tf">حفظ</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  $('#tf').onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const uname = f.username.trim();
    if (usernameTaken(uname, id)) return toast('اسم المستخدم مستخدم بالفعل', true);
    const data = { name: f.name.trim(), username: uname, code: f.code.trim(), country: f.country, phone: f.phone.trim(), active: !!f.active, supervisorId: f.supervisorId || '' };
    if (id) Object.assign(t, data); else db.teachers.push({ id: uid(), createdAt: Date.now(), ...data });
    Store.save(); closeModal(); toast('تم الحفظ'); render();
  };
}
function delTeacher(id) {
  const n = db.students.filter(s => s.teacherId === id).length;
  if (!confirmBox(n ? `هذا المحفظ لديه ${n} طالب — سيصبحون بدون محفظ. متابعة؟` : 'حذف المحفظ؟')) return;
  db.students.forEach(s => { if (s.teacherId === id) s.teacherId = ''; });
  db.teachers = db.teachers.filter(t => t.id !== id);
  Store.save(); render();
}

/* =============== المشرفات =============== */
function supervisors() {
  return `
  <div class="topbar"><h2>المشرفات</h2><button class="btn" onclick="supervisorForm()">+ إضافة مشرفة</button></div>
  <p class="muted small">المشرفة تدخل بـ «اسم المستخدم + الرقم» وتشوف تقارير الحصص الجاهزة وتبعتها للجروبات من واتساب موبايلها.</p>
  ${db.supervisors.length ? `<div class="table-wrap"><table>
    <tr><th>الاسم</th><th>المحفظين التابعين</th><th>الطلاب</th><th>اسم المستخدم</th><th>رقم الدخول</th><th>الهاتف</th><th>تقارير أرسلتها</th><th>الحالة</th><th></th></tr>
    ${db.supervisors.map(u => { const ts = db.teachers.filter(t => t.supervisorId === u.id), sts = db.students.filter(st => effSupervisorId(st) === u.id);
      return `<tr><td><b>${esc(u.name)}</b></td>
      <td><div class="chips">${ts.map(t => `<span class="chip">${esc(t.name)}</span>`).join('') || '<span class="muted small">—</span>'}</div></td>
      <td>${sts.length}</td><td dir="ltr" style="text-align:right">${esc(u.username)}</td><td><code>${esc(u.code)}</code></td>
      <td dir="ltr" style="text-align:right">${esc(u.phone || '—')}</td>
      <td>${groupReports().filter(r => r.group.status === 'sent' && r.group.sentBy?.id === u.id).length}</td>
      <td>${u.active === false ? '<span class="pill gray">موقوف</span>' : '<span class="pill ok">فعال</span>'}</td>
      <td><div class="actions"><button class="btn sm ghost" onclick="supervisorForm('${u.id}')">تعديل</button>
        <button class="btn sm ghost" onclick="teacherForm('', '${u.id}')">+ محفظ جديد تحتها</button>
        <button class="btn sm ghost" onclick="filters.sup='${u.id}';go('students')">طلابها</button>
        <button class="btn sm danger" onclick="delSupervisor('${u.id}')">حذف</button></div></td></tr>`; }).join('')}
  </table></div>` : '<div class="card empty">لا توجد مشرفات بعد.</div>'}`;
}
function supervisorForm(id) {
  const u = id ? Store.supervisor(id) : { name: '', username: '', code: String(Math.floor(1000 + Math.random() * 9000)), phone: '', active: true };
  openModal(id ? 'تعديل مشرفة' : 'إضافة مشرفة', `
    <form id="uf">
      <div class="field"><label>الاسم</label><input name="name" required value="${esc(u.name)}"></div>
      <div class="row">
        <div class="field"><label>اسم المستخدم (للدخول)</label><input name="username" required dir="ltr" value="${esc(u.username)}" ${u.uid ? 'readonly title="لا يمكن تغييره بعد إنشاء الحساب"' : ''}></div>
        <div class="field"><label>رقم الدخول</label><input name="code" required inputmode="numeric" pattern="[0-9]{3,10}" value="${esc(u.code)}"></div>
      </div>
      <div class="field"><label>الهاتف</label><input name="phone" dir="ltr" value="${esc(u.phone)}"></div>
      <div class="field"><label>المحفظين التابعين لها</label>
        ${db.teachers.length ? `<div class="checks">${db.teachers.map(t => `<label><input type="checkbox" name="tch" value="${t.id}" ${id && t.supervisorId === id ? 'checked' : ''}>
          ${esc(t.name)} ${t.supervisorId && t.supervisorId !== id ? `<span class="muted small">(حاليًا مع ${esc(supervisorName(t.supervisorId))} — هيتنقل)</span>` : ''}</label>`).join('')}</div>` : '<p class="muted small">لا يوجد محفظين بعد.</p>'}</div>
      <div class="field"><label><input type="checkbox" name="active" style="width:auto" ${u.active !== false ? 'checked' : ''}> الحساب فعال</label></div>
    </form>`,
    `<button class="btn" form="uf">حفظ</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  $('#uf').onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), uname = f.username.trim();
    if (usernameTaken(uname, id)) return toast('اسم المستخدم مستخدم بالفعل', true);
    const data = { name: f.name.trim(), username: uname, code: f.code.trim(), phone: f.phone.trim(), active: !!f.active };
    let sid = id;
    if (id) Object.assign(u, data); else { sid = uid(); db.supervisors.push({ id: sid, createdAt: Date.now(), ...data }); }
    const picked = new Set($$('#uf [name=tch]:checked').map(x => x.value));
    db.teachers.forEach(t => { if (picked.has(t.id)) t.supervisorId = sid; else if (t.supervisorId === sid) t.supervisorId = ''; });
    Store.save(); closeModal(); toast('تم الحفظ'); render();
  };
}
function delSupervisor(id) {
  if (!confirmBox('حذف المشرفة؟ المحفظين والطلاب التابعين لها هيبقوا بدون مشرفة (سجل التقارير يفضل موجود)')) return;
  db.supervisors = db.supervisors.filter(u => u.id !== id);
  db.teachers.forEach(t => { if (t.supervisorId === id) t.supervisorId = ''; });
  db.students.forEach(st => { if (st.supervisorId === id) st.supervisorId = ''; });
  Store.save(); render();
}

/* =============== الطلاب =============== */
function students() {
  const q = filters.q.trim().toLowerCase();
  const list = VS().filter(s =>
    (!filters.teacher || s.teacherId === filters.teacher) &&
    (!filters.sup || effSupervisorId(s) === (filters.sup === 'none' ? '' : filters.sup)) &&
    (!filters.country || s.country === filters.country) &&
    (!filters.status || (filters.status === 'paid' ? isActive(s) : !isActive(s))) &&
    (!q || (s.name + ' ' + s.parentName + ' ' + s.parentPhone + ' ' + (s.groupName || '')).toLowerCase().includes(q)));
  return `
  <div class="topbar"><h2>الطلاب</h2><button class="btn" onclick="studentForm()" ${VT().length ? '' : 'disabled title="أضف محفظًا أولًا"'}>+ إضافة طالب</button></div>
  <div class="toolbar">
    <input placeholder="بحث بالاسم أو ولي الأمر أو الهاتف" value="${esc(filters.q)}" oninput="filters.q=this.value;debounceRender()">
    <select onchange="filters.teacher=this.value;render()"><option value="">كل المحفظين</option>${teacherOptions(filters.teacher, false)}</select>
    <select class="${IS_SUP ? 'hidden' : ''}" onchange="filters.sup=this.value;render()"><option value="">كل المشرفات</option>${db.supervisors.map(u => `<option value="${u.id}" ${u.id === filters.sup ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}<option value="none" ${filters.sup === 'none' ? 'selected' : ''}>بدون مشرفة</option></select>
    <select onchange="filters.status=this.value;render()">
      <option value="">كل الحالات</option><option value="paid" ${filters.status === 'paid' ? 'selected' : ''}>مدفوع</option><option value="expired" ${filters.status === 'expired' ? 'selected' : ''}>منتهي</option></select>
    <select onchange="filters.country=this.value;render()"><option value="">كل الدول</option>${countryOptions(filters.country)}</select>
  </div>
  ${list.length ? `<div class="table-wrap"><table>
    <tr><th>الطالب</th><th>ولي الأمر</th><th>المحفظ / المشرفة</th><th>المواعيد (توقيت الطالب)</th><th>المتبقي</th><th>الحضور</th><th>الاشتراك</th><th></th></tr>
    ${list.map(s => `<tr>
      <td><b>${esc(s.name)}</b><div class="muted small">${countryLabel(s.country)}</div><div class="small">${s.groupName ? '👥 ' + esc(s.groupName) : '<span style="color:var(--danger)">بدون جروب</span>'}</div></td>
      <td>${esc(s.parentName || '—')}<div class="small" dir="ltr" style="text-align:right">${esc(s.parentPhone)}</div></td>
      <td>${teacherName(s.teacherId)}<div class="small">👩‍💼 ${effSupervisorId(s) ? esc(supervisorName(effSupervisorId(s))) : '<span style="color:var(--danger)">بدون مشرفة</span>'}${s.supervisorId ? ' <span class="muted">(خاصة بالطالب)</span>' : ''}</div></td>
      <td><div class="list-slots">${isActive(s) ? (slotsIn(s, s.country).map(x => `<span>${fmtSlot(x)}</span>`).join('') || '<span class="muted">لا مواعيد</span>') : '<span class="muted">موقوفة لحين التجديد</span>'}</div></td>
      <td>${meter(s)}</td>
      <td class="small">✅ ${s.attended || 0}<br>❌ ${s.absent || 0}<br>🟡 ${s.excused || 0}</td>
      <td>${statusPill(s)}</td>
      <td><div class="actions">
        <button class="btn sm ghost" onclick="studentForm('${s.id}')">تعديل</button>
        ${IS_SUP ? '' : `<button class="btn sm gold" onclick="renewForm('${s.id}')">تجديد</button>`}
        <button class="btn sm ghost" onclick="studentLog('${s.id}')">السجل</button>
        ${IS_SUP ? '' : `<button class="btn sm danger" onclick="delStudent('${s.id}')">حذف</button>`}</div></td>
    </tr>`).join('')}
  </table></div>` : '<div class="card empty">لا يوجد طلاب مطابقين.</div>'}`;
}
let _rt; function debounceRender() {
  clearTimeout(_rt); _rt = setTimeout(() => {
    const pos = document.activeElement?.selectionStart; render();
    const i = $('.toolbar input'); i.focus(); i.setSelectionRange(pos, pos);
  }, 250);
}

function slotRow(s = { day: 0, time: '17:00' }) {
  return `<div class="slot-row"><select class="sd">${DAYS.map((d, i) => `<option value="${i}" ${i === +s.day ? 'selected' : ''}>${d}</option>`).join('')}</select>
    <input type="time" class="stt" value="${s.time}" required><button type="button" class="btn sm danger" onclick="this.parentElement.remove();slotPreview()">✕</button></div>`;
}
function readSlots() { return $$('#slots .slot-row').map(r => ({ day: +$('.sd', r).value, time: $('.stt', r).value })).filter(s => s.time); }
function slotPreview() {
  const f = $('#sf'); if (!f) return;
  const tch = Store.teacher(f.teacherId.value);
  const fake = { country: f.country.value, slots: readSlots() };
  const box = $('#slotPrev');
  if (!fake.slots.length) { box.innerHTML = ''; return; }
  const lines = [];
  if (tch && tch.country !== fake.country) lines.push(`<b>بتوقيت المحفظ (${countryLabel(tch.country)}):</b> ${slotsIn(fake, tch.country).map(fmtSlot).join(' · ')}`);
  if (S.adminCountry !== fake.country && (!tch || tch.country !== S.adminCountry)) lines.push(`<b>بتوقيتك (${countryLabel(S.adminCountry)}):</b> ${slotsIn(fake, S.adminCountry).map(fmtSlot).join(' · ')}`);
  box.innerHTML = lines.length ? `<div class="note small">${lines.join('<br>')}</div>` : '';
}

function studentForm(id, presetTeacher) {
  const s = id ? Store.student(id) : { name: '', parentName: '', parentPhone: '', country: 'EG', teacherId: presetTeacher || filters.teacher || '', total: S.defaultLectures, remaining: S.defaultLectures, status: 'paid', slots: [], notes: '', link: '', duration: 30 };
  openModal(id ? 'تعديل طالب' : 'إضافة طالب', `
    <form id="sf">
      <div class="row">
        <div class="field"><label>اسم الطالب</label><input name="name" required value="${esc(s.name)}"></div>
        <div class="field"><label>بلد الطالب</label><select name="country">${countryOptions(s.country)}</select></div>
      </div>
      <div class="row">
        <div class="field"><label>اسم ولي الأمر</label><input name="parentName" value="${esc(s.parentName)}"></div>
        <div class="field"><label>واتساب ولي الأمر</label><input name="parentPhone" required dir="ltr" placeholder="05xxxxxxxx أو 01xxxxxxxxx" value="${esc(s.parentPhone)}"></div>
      </div>
      <div class="row">
        <div class="field"><label>المحفظ</label><select name="teacherId" required>${teacherOptions(s.teacherId)}</select></div>
        <div class="field ${IS_SUP ? 'hidden' : ''}"><label>المشرفة</label><select name="supervisorId" id="stSup"></select></div>
      </div>
      <div class="field"><label>اسم جروب واتساب (زي ما هو في واتساب)</label><input name="groupName" placeholder="مثال: قرآن | أحمد محمد" value="${esc(s.groupName || '')}"></div>
      <div class="row3">
        <div class="field"><label>عدد محاضرات الباقة</label><input name="total" type="number" min="1" value="${s.total}"></div>
        <div class="field"><label>المحاضرات المتبقية</label><input name="remaining" type="number" min="0" value="${s.remaining}"></div>
        <div class="field"><label>حالة الاشتراك</label><select name="status"><option value="paid" ${s.status === 'paid' ? 'selected' : ''}>مدفوع</option><option value="expired" ${s.status === 'expired' ? 'selected' : ''}>منتهي</option></select></div>
      </div>
      <div class="field"><label>مواعيد الحلقات <span class="muted small">(بتوقيت بلد الطالب)</span></label>
        <div id="slots">${(s.slots.length ? s.slots : []).map(slotRow).join('')}</div>
        <button type="button" class="btn sm ghost" onclick="$('#slots').insertAdjacentHTML('beforeend',slotRow());slotPreview()">+ إضافة موعد</button>
        <div id="slotPrev" style="margin-top:10px"></div>
      </div>
      <div class="row">
        <div class="field"><label>مدة المحاضرة (دقيقة)</label><input name="duration" type="number" min="10" step="5" value="${s.duration || 30}"></div>
        <div class="field"><label>رابط الحلقة (Zoom / Meet) — اختياري</label><input name="link" dir="ltr" placeholder="https://" value="${esc(s.link || '')}"></div>
      </div>
      <div class="field"><label>ملاحظات تظهر للمحفظ</label><textarea name="notes" style="min-height:60px" placeholder="مثال: يحفظ حاليًا جزء عمّ">${esc(s.notes)}</textarea></div>
    </form>`,
    `<button class="btn" form="sf">حفظ</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  const f = $('#sf');
  // المشرفة: الافتراضي «مشرفة المحفظ» (تتغير معاه)، أو اختيار مشرفة مختلفة للطالب ده بس
  const supSel = () => {
    const tSup = Store.teacher(f.teacherId.value)?.supervisorId || '', cur = f.supervisorId.value || s.supervisorId || '';
    f.supervisorId.innerHTML = `<option value="">تبع المحفظ — ${tSup ? esc(supervisorName(tSup)) : 'المحفظ بدون مشرفة'}</option>` +
      db.supervisors.filter(u => u.id !== tSup).map(u => `<option value="${u.id}" ${u.id === cur ? 'selected' : ''}>${esc(u.name)} (للطالب ده بس)</option>`).join('');
  };
  f.teacherId.addEventListener('change', supSel); supSel();
  f.addEventListener('input', slotPreview); f.addEventListener('change', slotPreview); slotPreview();
  f.onsubmit = e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const data = {
      name: d.name.trim(), parentName: d.parentName.trim(), parentPhone: d.parentPhone.trim(), country: d.country, teacherId: d.teacherId,
      total: Math.max(1, +d.total || 1), remaining: Math.max(0, +d.remaining || 0), notes: d.notes.trim(), slots: readSlots(),
      link: d.link.trim(), duration: Math.max(10, +d.duration || 30), groupName: (d.groupName || '').trim(),
      supervisorId: IS_SUP ? '' : (d.supervisorId && d.supervisorId !== Store.teacher(d.teacherId)?.supervisorId ? d.supervisorId : ''),
    };
    if (!id || JSON.stringify(s.slots) !== JSON.stringify(data.slots)) data.slotsAt = Date.now();
    data.status = data.remaining <= 0 ? 'expired' : d.status;
    let st;
    if (id) { st = Object.assign(s, data); }
    else { st = { id: uid(), createdAt: Date.now(), attended: 0, absent: 0, excused: 0, renewals: [], ...data }; db.students.push(st); }
    Store.save();
    closeModal(); toast('تم الحفظ'); render();
  };
}

function renewForm(id) {
  const s = Store.student(id);
  openModal(`تجديد اشتراك — ${esc(s.name)}`, `
    <form id="rf">
      <p class="muted">المتبقي حاليًا: <b>${s.remaining}</b> — الحالة: ${statusPill(s)}</p>
      <div class="field"><label>عدد محاضرات الباقة الجديدة</label><input name="n" type="number" min="1" value="${s.total || S.defaultLectures}" required></div>
    </form>`,
    `<button class="btn gold" form="rf">تأكيد الدفع والتجديد</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  $('#rf').onsubmit = e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    renewStudent(s, d.n);
    closeModal(); toast('تم تجديد الاشتراك'); render();
  };
}

function sendSchedule(id) {
  const s = Store.student(id);
  if (!isActive(s)) return toast('الاشتراك منتهي — جدد أولًا', true);
  if (!s.slots?.length) return toast('لا توجد مواعيد لهذا الطالب', true);
  const m = queueSchedule(s);
  openModal('رسالة المواعيد', `<div class="msg-preview">${esc(m.text)}</div>`,
    `<button class="btn wa" onclick="sendWhatsApp('${m.id}');closeModal();render()">إرسال عبر واتساب</button>
     <button class="btn ghost" onclick="closeModal();render()">لاحقًا (في صندوق الرسائل)</button>`);
}

function studentLog(id) {
  const s = Store.student(id);
  const reps = db.reports.filter(r => r.studentId === id).sort((a, b) => b.createdAt - a.createdAt);
  openModal(`سجل ${esc(s.name)}`, `
    <div class="stats" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat"><div class="n">${s.attended || 0}</div><div class="l">حضر</div></div>
      <div class="stat danger"><div class="n">${(s.absent || 0) + (s.excused || 0)}</div><div class="l">لم يحضر</div></div>
      <div class="stat warn"><div class="n">${reps.length}</div><div class="l">محاضرات مسجلة</div></div>
      <div class="stat gold"><div class="n">${s.remaining}</div><div class="l">متبقي</div></div>
    </div>
    ${(s.renewals || []).length ? `<p class="small muted">التجديدات: ${s.renewals.map(r => `${fmtDate(r.date)} (${r.lectures})`).join(' · ')}</p>` : ''}
    ${reps.length ? `<div class="table-wrap"><table><tr><th>التاريخ</th><th>الوقت</th><th>المحفظ</th><th>الحضور</th><th>رقم المحاضرة</th><th>المتبقي</th></tr>
      ${reps.map(r => { const w = repWhen(r, S.adminCountry); return `<tr><td>${fmtDayDate(w.iso)}</td><td>${w.time ? fmtTime(w.time) : '—'}</td><td>${teacherName(r.teacherId)}</td><td>${attPill(r)}</td><td>${r.lectureNo || '—'}</td><td>${r.remainingAfter}</td></tr>`; }).join('')}
    </table></div>` : '<div class="empty">لا توجد محاضرات مسجلة</div>'}`);
}

function delStudent(id) {
  if (!confirmBox('حذف الطالب وكل محاضراته المسجلة؟')) return;
  db.students = db.students.filter(s => s.id !== id);
  db.reports = db.reports.filter(r => r.studentId !== id);
  db.outbox = db.outbox.filter(m => m.studentId !== id);
  Store.save(); render();
}

/* =============== الجدول الأسبوعي =============== */
let schedTeacher = '', schedCountry = '';
function schedule() {
  const view = schedCountry || S.adminCountry;
  const n = nowIn(view);
  const days = DAYS.map(() => []);
  VS().filter(isActive).filter(s => !schedTeacher || s.teacherId === schedTeacher)
    .forEach(st => slotsIn(st, view).forEach(x => days[x.day].push({ st, x })));
  days.forEach(d => d.sort((a, b) => slotMin(a.x) - slotMin(b.x)));
  return `
  <div class="topbar"><h2>الجدول الأسبوعي</h2></div>
  <div class="toolbar">
    <select onchange="schedTeacher=this.value;render()"><option value="">كل المحفظين</option>${teacherOptions(schedTeacher, false)}</select>
    <select onchange="schedCountry=this.value;render()">${Object.entries(COUNTRIES).map(([k, c]) => `<option value="${k}" ${k === view ? 'selected' : ''}>عرض بتوقيت ${c.name}</option>`).join('')}</select>
  </div>
  <p class="muted small">يظهر فقط الطلاب ذوو الاشتراك المدفوع — الاشتراكات المنتهية لا تُجدول لها محاضرات.</p>
  <div class="week">${days.map((list, i) => `<div class="day ${i === n.day ? 'today' : ''}"><h4>${DAYS[i]}</h4>
    ${list.map(({ st, x }) => `<div class="slot"><b>${fmtTime(x.time)}</b>${esc(st.name)}<div class="muted small">${teacherName(st.teacherId)} · ${COUNTRIES[st.country].flag}</div></div>`).join('') || '<div class="empty small">—</div>'}
  </div>`).join('')}</div>`;
}

/* =============== محاضرات المحفظين =============== */
const lec = { teacher: '', month: '', student: '', q: '', sort: 'done' };
const attPill = r => r.attendance === 'present' ? '<span class="pill ok">حضر</span>' : '<span class="pill danger">لم يحضر</span>';
let _missed = [];
function pickLec(id) { lec.teacher = id; lec.student = ''; render(); setTimeout(() => $('#lecDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); }

function reports() {
  const C = S.adminCountry, nowM = nowIn(C).iso.slice(0, 7);
  if (!lec.month) lec.month = nowM;
  const all = db.reports.filter(r => !IS_SUP || VT().some(t => t.id === r.teacherId)).map(r => ({ r, w: repWhen(r, C) }));
  const months = [...new Set([nowM, ...all.map(x => x.w.iso.slice(0, 7))])].sort().reverse();
  const inMonth = lec.month === 'all' ? all : all.filter(x => x.w.iso.startsWith(lec.month));
  const now = Date.now();

  // ملخص كل المحفظين
  const q = lec.q.trim().toLowerCase();
  let sum = VT().filter(t => !q || t.name.toLowerCase().includes(q)).map(t => {
    const rs = inMonth.filter(x => x.r.teacherId === t.id);
    const p = rs.filter(x => x.r.attendance === 'present').length;
    const missed = lec.month === nowM ? teacherSessions(t.id, C, 31, 0).filter(o => !o.rec && o.ts < now && o.date.startsWith(nowM)).length : 0;
    const last = rs.sort((a, b) => (b.r.sessionTs || b.r.createdAt) - (a.r.sessionTs || a.r.createdAt))[0];
    const gs = rs.filter(x => x.r.group);
    return { t, n: rs.length, p, a: rs.length - p, missed, gSent: gs.filter(x => x.r.group.status === 'sent').length, gReady: gs.filter(x => x.r.group.status !== 'sent').length, students: new Set(rs.map(x => x.r.studentId)).size, last: last ? last.w : null,
      active: db.students.filter(s => s.teacherId === t.id && isActive(s)).length };
  });
  const sorters = { done: (a, b) => b.n - a.n, name: (a, b) => a.t.name.localeCompare(b.t.name, 'ar'), missed: (a, b) => b.missed - a.missed };
  sum.sort(sorters[lec.sort]);
  const tot = sum.reduce((o, x) => ({ n: o.n + x.n, p: o.p + x.p, a: o.a + x.a, m: o.m + x.missed }), { n: 0, p: 0, a: 0, m: 0 });

  const T = Store.teacher(lec.teacher);
  return `
  <div class="topbar"><h2>محاضرات المحفظين</h2><button class="btn ghost sm" onclick="exportLectures()">⬇️ تصدير Excel</button></div>
  <div class="toolbar">
    <select onchange="lec.month=this.value;render()">${months.map(m => `<option value="${m}" ${m === lec.month ? 'selected' : ''}>${m === nowM ? 'الشهر الحالي — ' : ''}${m}</option>`).join('')}<option value="all" ${lec.month === 'all' ? 'selected' : ''}>كل الفترات</option></select>
    <input placeholder="🔍 بحث باسم المحفظ" value="${esc(lec.q)}" oninput="lec.q=this.value;debounceLec()">
    <select onchange="lec.sort=this.value;render()">
      <option value="done" ${lec.sort === 'done' ? 'selected' : ''}>ترتيب: الأكثر محاضرات</option>
      <option value="missed" ${lec.sort === 'missed' ? 'selected' : ''}>ترتيب: الأكثر محاضرات لم تُسجل</option>
      <option value="name" ${lec.sort === 'name' ? 'selected' : ''}>ترتيب: الاسم</option></select>
  </div>
  <div class="stats">
    <div class="stat"><div class="n">${tot.n}</div><div class="l">محاضرات مسجلة</div></div>
    <div class="stat"><div class="n">${tot.p}</div><div class="l">حضر</div></div>
    <div class="stat danger"><div class="n">${tot.a}</div><div class="l">لم يحضر</div></div>
    <div class="stat warn"><div class="n">${tot.m}</div><div class="l">مجدولة ولم تُسجل بعد</div></div>
  </div>
  ${T ? lecDetail(T, inMonth, nowM) : '<p class="muted small">اضغط «التفاصيل» أمام أي محفظ لعرض محاضراته وتعديلها.</p>'}
  <div class="table-wrap"><table>
    <tr><th>المحفظ</th><th>طلاب نشطين</th><th>المحاضرات المسجلة</th><th>حضر</th><th>لم يحضر</th><th>لم تُسجل</th><th>تقارير اتبعت للجروب</th><th>آخر محاضرة</th><th></th></tr>
    ${sum.map(x => `<tr class="${x.t.id === lec.teacher ? 'sel' : ''}"><td><b>${esc(x.t.name)}</b><div class="muted small">${countryLabel(x.t.country)}</div></td><td>${x.active}</td>
      <td><b style="font-size:17px">${x.n}</b></td><td>${x.p}</td><td>${x.a}</td>
      <td>${x.missed ? `<span class="pill warn">${x.missed}</span>` : '—'}</td>
      <td>${x.gSent}${x.gReady ? ` <span class="pill gold">${x.gReady} جاهز</span>` : ''}</td>
      <td class="small">${x.last ? `${fmtDayDate(x.last.iso)}${x.last.time ? ' ' + fmtTime(x.last.time) : ''}` : '—'}</td>
      <td><button class="btn sm ${x.t.id === lec.teacher ? '' : 'ghost'}" onclick="pickLec('${x.t.id}')">التفاصيل</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">لا نتائج</td></tr>'}
  </table></div>
`;
}
let _lt; function debounceLec() { clearTimeout(_lt); _lt = setTimeout(() => { const pos = document.activeElement?.selectionStart; render(); const i = $('.toolbar input'); i.focus(); i.setSelectionRange(pos, pos); }, 250); }

function lecDetail(T, inMonth, nowM) {
  const C = S.adminCountry, now = Date.now();
  const rows = inMonth.filter(x => x.r.teacherId === T.id && (!lec.student || x.r.studentId === lec.student))
    .sort((a, b) => (b.r.sessionTs || b.r.createdAt) - (a.r.sessionTs || a.r.createdAt));
  _missed = teacherSessions(T.id, C, 14, 0).filter(o => !o.rec && o.ts < now && (!lec.student || o.st.id === lec.student));
  const sts = db.students.filter(s => s.teacherId === T.id || inMonth.some(x => x.r.teacherId === T.id && x.r.studentId === s.id));
  return `
  <div class="card detail-card" id="lecDetail">
    <div class="topbar" style="margin-bottom:10px"><h3 style="margin:0">محاضرات ${esc(T.name)} <span class="muted small">— ${lec.month === 'all' ? 'كل الفترات' : lec.month} · بتوقيت ${countryLabel(C)}</span></h3>
      <div style="display:flex;gap:6px"><select style="width:auto" onchange="lec.student=this.value;render()"><option value="">كل الطلاب</option>${sts.map(s => `<option value="${s.id}" ${s.id === lec.student ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <button class="btn sm ghost" onclick="lec.teacher='';render()">إغلاق</button></div></div>
    ${_missed.length ? `<div class="note"><b>⚠️ محاضرات مجدولة لم يسجلها المحفظ (آخر 14 يوم):</b>
      ${_missed.map((o, i) => `<div class="miss-row"><span>${fmtDayDate(o.date)} · ${fmtTime(o.time)} — <b>${esc(o.st.name)}</b></span>
        <span><button class="btn sm" onclick="adminRecord(${i},'present')">✅ حضر</button> <button class="btn sm danger" onclick="adminRecord(${i},'absent')">❌ لم يحضر</button></span></div>`).join('')}</div>` : ''}
    ${rows.length ? `<div class="table-wrap"><table>
      <tr><th>اليوم والتاريخ</th><th>الوقت</th><th>الطالب</th><th>الحضور (قابل للتعديل)</th><th>رقم المحاضرة</th><th>المتبقي</th><th>سُجلت</th><th></th></tr>
      ${rows.map(({ r, w }) => `<tr><td>${fmtDayDate(w.iso)}</td><td>${w.time ? fmtTime(w.time) : '—'}</td><td>${esc(Store.student(r.studentId)?.name || '—')}</td>
        <td><select class="att-sel ${r.attendance === 'present' ? 'ok' : 'bad'}" onchange="adminEdit('${r.id}',this.value)">
          <option value="present" ${r.attendance === 'present' ? 'selected' : ''}>✅ حضر</option><option value="absent" ${r.attendance !== 'present' ? 'selected' : ''}>❌ لم يحضر</option></select>
          ${r.editedAt ? '<div class="muted small">عُدلت من المدير</div>' : r.byAdmin ? '<div class="muted small">سجلها المدير</div>' : ''}</td>
        <td>${r.lectureNo || '—'}</td><td>${r.remainingAfter}</td><td class="small muted">${fmtDateTime(r.createdAt)}</td>
        <td><button class="btn sm danger" onclick="adminUndo('${r.id}')">حذف</button></td></tr>`).join('')}
    </table></div>` : '<div class="empty">لا توجد محاضرات مسجلة في هذه الفترة.</div>'}
  </div>`;
}
function adminEdit(id, att) { editSession(id, att); toast('تم تعديل الحضور'); render(); }
function adminRecord(i, att) {
  const o = _missed[i]; if (!o) return;
  try {
    const { rep, msgs } = recordSession(o.st, Store.teacher(o.st.teacherId), o, att); rep.byAdmin = true; Store.save(); render();
    if (msgs.length) deliver(msgs[0]).then(r => { toast(r === 'sent' ? 'آخر محاضرة — أُرسل تذكير الاشتراك ✅' : 'آخر محاضرة — الرسالة في صندوق واتساب', r === 'failed'); render(); });
    else toast('تم التسجيل');
  }
  catch (e) { toast(e.message, true); }
}
function adminUndo(id) {
  if (!confirmBox('حذف تسجيل المحاضرة وإرجاعها لرصيد الطالب؟')) return;
  undoSession(id); toast('تم الحذف'); render();
}
function exportLectures() {
  const C = S.adminCountry;
  const rows = [['التاريخ', 'الوقت', 'المحفظ', 'الطالب', 'الحضور', 'رقم المحاضرة', 'المتبقي']];
  db.reports.filter(r => (!IS_SUP || VT().some(t => t.id === r.teacherId)) && (!lec.teacher || r.teacherId === lec.teacher) && (!lec.student || r.studentId === lec.student))
    .map(r => ({ r, w: repWhen(r, C) })).filter(x => !lec.month || lec.month === 'all' || x.w.iso.startsWith(lec.month))
    .sort((a, b) => (a.r.sessionTs || a.r.createdAt) - (b.r.sessionTs || b.r.createdAt))
    .forEach(({ r, w }) => rows.push([w.iso, w.time, Store.teacher(r.teacherId)?.name || '', Store.student(r.studentId)?.name || '', ATT[r.attendance], r.lectureNo || '', r.remainingAfter]));
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `qraan-lectures-${lec.month || 'all'}.csv`; a.click();
}

/* =============== رسائل واتساب =============== */
let outTab = 'pending';
function outbox() {
  const list = db.outbox.filter(m => m.status === outTab).sort((a, b) => outTab === 'pending' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
  const pc = db.outbox.filter(m => m.status === 'pending').length;
  const api = S.waMode === 'api';
  return `
  <div class="topbar"><h2>رسائل واتساب</h2>
    <div class="seg" style="margin:0;min-width:260px"><button class="${outTab === 'pending' ? 'active' : ''}" onclick="outTab='pending';render()">لم تُرسل (${pc})</button><button class="${outTab === 'sent' ? 'active' : ''}" onclick="outTab='sent';render()">المُرسلة</button></div></div>
  <div class="note">${api ? '✅ الإرسال التلقائي عبر WhatsApp Business API مفعّل — الرسالة تُرسل لولي الأمر فور تسجيل آخر محاضرة في الباقة. هنا تظهر الرسائل التي فشل إرسالها لإعادة المحاولة.'
    : '⚠️ الإرسال التلقائي غير مفعّل — فعّله من «الإعدادات ← ربط واتساب». حاليًا تُرسل الرسالة يدويًا بزر واتساب.'}
    <br><span class="small">الرسالة الوحيدة: تُرسل لولي الأمر عند انتهاء آخر محاضرة في الباقة.</span></div>
  ${pc > 1 && api && outTab === 'pending' ? `<button class="btn" style="margin-bottom:12px" onclick="retryAll()">إعادة إرسال الكل (${pc})</button>` : ''}
  ${list.length ? list.map(m => `<div class="card">
      <div class="topbar" style="margin-bottom:8px"><div>${kindPill(m.kind)} <b>${esc(m.studentName)}</b> <span class="muted small" dir="ltr">+${esc(m.phone)}</span></div>
      <span class="muted small">${fmtDateTime(m.sentAt || m.createdAt)}${m.via === 'api' ? ' · عبر API' : m.status === 'sent' ? ' · يدوي' : ''}</span></div>
      <div class="msg-preview">${esc(m.text)}</div>
      ${m.error ? `<div class="note small" style="background:var(--danger-soft);border-color:#f0c9c4;margin:8px 0 0">فشل الإرسال: ${esc(m.error)}</div>` : ''}
      <div class="actions" style="display:flex;gap:6px;margin-top:10px">
        ${api && m.status === 'pending' ? `<button class="btn sm" onclick="retryOne('${m.id}')">إرسال عبر API</button>` : ''}
        <button class="btn sm wa" onclick="sendWhatsApp('${m.id}');render()">${m.status === 'sent' ? 'إعادة الإرسال يدويًا' : 'إرسال يدوي (واتساب)'}</button>
        ${m.status === 'pending' ? `<button class="btn sm ghost" onclick="markSent('${m.id}');render()">تم الإرسال</button>` : ''}
        <button class="btn sm danger" onclick="delMsg('${m.id}')">حذف</button>
      </div></div>`).join('') : '<div class="card empty">لا توجد رسائل.</div>'}`;
}
function delMsg(id) { db.outbox = db.outbox.filter(m => m.id !== id); Store.save(); render(); }
async function retryOne(id) {
  const m = db.outbox.find(x => x.id === id); if (!m) return;
  const r = await deliver(m); toast(r === 'sent' ? 'تم الإرسال ✅' : 'فشل: ' + (m.error || ''), r !== 'sent'); render();
}
async function retryAll() {
  let ok = 0; for (const m of db.outbox.filter(x => x.status === 'pending')) if (await deliver(m) === 'sent') ok++;
  toast(`تم إرسال ${ok} رسالة`); render();
}

/* =============== الإعدادات =============== */
function settings() {
  return `
  <div class="topbar"><h2>الإعدادات</h2></div>
  <form id="setf" class="card">
    <h3>بيانات الأكاديمية</h3>
    <div class="row">
      <div class="field"><label>اسم الأكاديمية</label><input name="academy" value="${esc(S.academy)}"></div>
      <div class="field"><label>رقم واتساب الأكاديمية</label><input name="whatsapp" dir="ltr" value="${esc(S.whatsapp)}"></div>
    </div>
    <div class="row">
      <div class="field"><label>بلد المدير (توقيت لوحة التحكم)</label><select name="adminCountry">${countryOptions(S.adminCountry)}</select></div>
      <div class="field"><label>عدد محاضرات الباقة الافتراضي</label><input name="defaultLectures" type="number" min="1" value="${S.defaultLectures}"></div>
    </div>
    <div class="field"><label><input type="checkbox" name="absentCounts" style="width:auto" ${S.absentCounts ? 'checked' : ''}> «لم يحضر» يُخصم من محاضرات الباقة</label></div>
    <h3 style="margin-top:10px">رسالة واتساب (انتهاء الباقة)</h3>
    <p class="muted small">تُرسل لولي الأمر تلقائيًا عند تسجيل آخر محاضرة في الباقة. هذه هي الرسالة الوحيدة في النظام.</p>
    <div class="field"><textarea name="tplEnd" rows="4">${esc(S.tplEnd)}</textarea></div>
    <h3 style="margin-top:10px">قالب تقرير الحصة (للجروب)</h3>
    <p class="muted small">المحفظ بيملأ التقرير، والنص ده بيتكوّن تلقائي وتبعته المشرفة للجروب. المتغيرات:
      <code>{academy}</code> <code>{teacher}</code> <code>{student}</code> <code>{newSura}</code> <code>{newLevel}</code> <code>{revSura}</code> <code>{revLevel}</code>
      <code>{hwNew}</code> <code>{hwRev}</code> <code>{tajweed}</code> <code>{shari}</code> <code>{duration}</code> <code>{lectureNo}</code> <code>{dayname}</code> <code>{date}</code></p>
    <div class="field"><textarea name="tplGroup" rows="14" style="font-size:14px">${esc(S.tplGroup)}</textarea></div>
    <button type="button" class="btn sm ghost" style="margin-bottom:12px" onclick="$('[name=tplGroup]').value=DEFAULT_TPL_GROUP">استرجاع القالب الافتراضي</button><br>
    <button class="btn">حفظ الإعدادات</button>
  </form>
  <form id="waf" class="card">
    <h3>ربط واتساب Business API</h3>
    <div class="note small">
      1) من <b>Meta Business Manager ← WhatsApp Manager ← Message templates</b> أنشئ قالبًا من نوع <b>Utility</b> باللغة العربية بنفس نص الرسالة أعلاه، وانتظر الموافقة.<br>
      2) انسخ <b>Phone Number ID</b> و<b>Permanent Access Token</b> (من System User) واسم القالب هنا.<br>
      3) اضغط «إرسال رسالة اختبار» على رقمك قبل التفعيل.
    </div>
    <div class="field"><label>طريقة الإرسال</label>
      <div class="radio-row">
        <label><input type="radio" name="waMode" value="manual" ${S.waMode !== 'api' ? 'checked' : ''}><span>يدوي (زر واتساب)</span></label>
        <label><input type="radio" name="waMode" value="api" ${S.waMode === 'api' ? 'checked' : ''}><span>تلقائي (Business API)</span></label>
      </div></div>
    <div class="row">
      <div class="field"><label>Phone Number ID</label><input name="waPhoneId" dir="ltr" value="${esc(S.waPhoneId)}"></div>
      <div class="field"><label>Access Token</label><input name="waToken" type="password" dir="ltr" value="${esc(S.waToken)}" autocomplete="off"></div>
    </div>
    <div class="row3">
      <div class="field"><label>اسم القالب (Template name)</label><input name="waTemplate" dir="ltr" placeholder="subscription_renewal" value="${esc(S.waTemplate)}"></div>
      <div class="field"><label>لغة القالب</label><input name="waLang" dir="ltr" value="${esc(S.waLang || 'ar')}"></div>
      <div class="field"><label>إصدار API</label><input name="waVersion" dir="ltr" value="${esc(S.waVersion || 'v21.0')}"></div>
    </div>
    <div class="field"><label>رابط خادم وسيط (اختياري — أكثر أمانًا)</label><input name="waProxy" dir="ltr" placeholder="https://..." value="${esc(S.waProxy)}">
      <p class="muted small" style="margin:2px 0 0">لو موجود، يُرسل له الطلب بدل Meta مباشرة ويُترك التوكن على الخادم.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
      <button class="btn">حفظ إعدادات واتساب</button>
      <div class="field" style="margin:0;flex:1;min-width:180px"><label>رقم للاختبار</label><input id="waTestTo" dir="ltr" placeholder="2010xxxxxxxx"></div>
      <button type="button" class="btn ghost" onclick="waTest()">إرسال رسالة اختبار</button>
    </div>

  </form>
  <form id="pwf" class="card">
    <h3>بيانات دخول المدير</h3>
    <p class="muted small">البريد: <b dir="ltr">${esc(Store.profile?.email || '')}</b></p>
    <div class="row">
      <div class="field"><label>كلمة المرور الحالية</label><input name="old" type="password" required autocomplete="current-password"></div>
      <div class="field"><label>كلمة المرور الجديدة</label><input name="pw" type="password" minlength="6" required autocomplete="new-password"></div>
    </div>
    <button class="btn">تغيير كلمة المرور</button>
  </form>
  <div class="card">
    <h3>النسخ الاحتياطي</h3>
    <p class="muted small">البيانات محفوظة على Firebase ومتزامنة بين كل الأجهزة. خذ نسخة احتياطية بانتظام.</p>
    ${hasLocalData() ? `<div class="note">📦 فيه بيانات قديمة محفوظة في المتصفح ده (من قبل Firebase): ${localSummary()}<br>
      <button class="btn gold sm" style="margin-top:6px" onclick="migrateLocal()">نقلها إلى Firebase</button></div>` : ''}
    <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn ghost" onclick="exportData()">⬇️ تصدير نسخة (JSON)</button>
      <label class="btn ghost" style="margin:0">⬆️ استيراد نسخة<input type="file" accept=".json" hidden onchange="importData(this.files[0])"></label>
      <button class="btn ghost" onclick="loadDemo()">تحميل بيانات تجريبية</button>
      <button class="btn danger" onclick="resetAll()">مسح كل البيانات</button>
    </div>
  </div>`;
}
document.addEventListener('submit', async e => {
  if (e.target.id === 'setf') {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    Object.assign(S, {
      academy: d.academy.trim() || 'Qraan', whatsapp: d.whatsapp.trim(), adminCountry: d.adminCountry,
      defaultLectures: Math.max(1, +d.defaultLectures || 8), absentCounts: !!d.absentCounts,
      tplEnd: d.tplEnd.trim() || S.tplEnd, tplGroup: d.tplGroup.trim() || DEFAULT_TPL_GROUP,
    });
    Store.save(); toast('تم حفظ الإعدادات'); render();
  }
  if (e.target.id === 'waf') {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    Object.assign(S, { waMode: d.waMode, waPhoneId: d.waPhoneId.trim(), waToken: d.waToken.trim(), waTemplate: d.waTemplate.trim(),
      waLang: d.waLang.trim() || 'ar', waVersion: d.waVersion.trim() || 'v21.0', waProxy: d.waProxy.trim() });
    if (S.waMode === 'api' && !S.waProxy && !(S.waPhoneId && S.waToken && S.waTemplate)) { S.waMode = 'manual'; toast('أكمل Phone Number ID والتوكن واسم القالب أولًا', true); }
    else toast('تم حفظ إعدادات واتساب');
    Store.save(); render();
  }
  if (e.target.id === 'pwf') {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      const u = FB.auth.currentUser;
      await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, d.old));
      await u.updatePassword(d.pw); toast('تم تغيير كلمة المرور ✅'); render();
    } catch (err) { toast(err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' ? 'كلمة المرور الحالية غير صحيحة' : errMsg(err), true); }
  }
});

async function waTest() {
  const to = normPhone($('#waTestTo').value, S.adminCountry);
  if (!to) return toast('اكتب رقم الاختبار', true);
  const f = $('#waf'), d = Object.fromEntries(new FormData(f));
  const saved = { ...S };
  Object.assign(S, { waPhoneId: d.waPhoneId.trim(), waToken: d.waToken.trim(), waTemplate: d.waTemplate.trim(), waLang: d.waLang.trim() || 'ar', waVersion: d.waVersion.trim() || 'v21.0', waProxy: d.waProxy.trim() });
  toast('جارٍ الإرسال...');
  try { await apiSend({ phone: to, text: S.tplEnd }); toast('تم إرسال رسالة الاختبار ✅ — راجع واتساب'); }
  catch (e) { toast('فشل: ' + e.message, true); }
  Object.assign(S, saved);
}
function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = `qraan-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
}
/** دمج بيانات (نسخة JSON أو بيانات المتصفح القديمة) في Firebase — حسابات المحفظين والمشرفات تتعمل تلقائيًا */
function mergeData(d) {
  let n = 0;
  COLS.forEach(col => (d[col] || []).forEach(o => {
    if (!o?.id) return;
    const copy = { ...o }; delete copy.uid; delete copy.authEmail;   // الحساب يتعمل من جديد في المشروع ده
    const i = db[col].findIndex(x => x.id === o.id);
    if (i >= 0) { if (db[col][i].uid) { copy.uid = db[col][i].uid; copy.authEmail = db[col][i].authEmail; } Object.assign(db[col][i], copy); } else db[col].push(copy);
    n++;
  }));
  if (d.settings) {
    const keep = { ...d.settings }; ['adminHash', 'adminEmail', 'msgV2'].forEach(k => delete keep[k]);
    Object.assign(S, keep);
  }
  Store.save();
  return n;
}
function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d.settings || !Array.isArray(d.students)) throw 0;
      if (!confirmBox('دمج بيانات الملف مع البيانات الحالية؟ (العناصر بنفس المعرّف هتتحدث)')) return;
      const n = mergeData(d); toast(`تم استيراد ${n} عنصر — جارٍ إنشاء حسابات الدخول...`); render();
    } catch { toast('ملف غير صالح', true); }
  };
  r.readAsText(file);
}
function localData() { try { return JSON.parse(localStorage.getItem(DB_KEY)); } catch { return null; } }
const hasLocalData = () => { const d = localData(); return !!(d && (d.teachers?.length || d.students?.length)); };
const localSummary = () => { const d = localData(); return `${d.teachers?.length || 0} محفظ، ${d.supervisors?.length || 0} مشرفة، ${d.students?.length || 0} طالب، ${d.reports?.length || 0} محاضرة`; };
async function migrateLocal() {
  const d = localData(); if (!d) return;
  if (!confirmBox(`نقل البيانات القديمة (${localSummary()}) إلى Firebase؟`)) return;
  const n = mergeData(d); render();
  toast(`جارٍ نقل ${n} عنصر وإنشاء حسابات الدخول — استنى لحد ما تخلص...`);
  await Store._pending;
  localStorage.setItem(DB_KEY + '_migrated', localStorage.getItem(DB_KEY)); localStorage.removeItem(DB_KEY);
  toast('تم النقل إلى Firebase ✅ — المحفظين والمشرفات يدخلوا بنفس اسم المستخدم والرقم'); render();
}
function resetAll() {
  if (!confirmBox('سيتم حذف كل المحفظين والمشرفات والطلاب والمحاضرات والرسائل نهائيًا من Firebase. متابعة؟')) return;
  if (!confirmBox('تأكيد أخير: الحذف لا يمكن التراجع عنه. حذف كل البيانات؟')) return;
  COLS.forEach(c => { db[c] = []; });
  Store.save(); toast('جارٍ حذف البيانات...'); render();
}
function loadDemo() {
  if (db.students.length && !confirmBox('سيتم إضافة بيانات تجريبية إلى بياناتك الحالية. متابعة؟')) return;
  const t1 = { id: uid(), name: 'الشيخ أحمد سالم', username: 'ahmed', code: '1234', country: 'EG', phone: '01000000000', active: true, createdAt: Date.now() };
  const t2 = { id: uid(), name: 'الأستاذة مريم خالد', username: 'mariam', code: '5678', country: 'SA', phone: '0500000000', active: true, createdAt: Date.now() };
  db.teachers.push(t1, t2);
  let sup1 = db.supervisors.find(u => u.username === 'sara'), sup2 = db.supervisors.find(u => u.username === 'huda');
  if (!sup1) db.supervisors.push(sup1 = { id: uid(), name: 'المشرفة سارة', username: 'sara', code: '1111', phone: '', active: true, createdAt: Date.now() });
  if (!sup2) db.supervisors.push(sup2 = { id: uid(), name: 'المشرفة هدى', username: 'huda', code: '2222', phone: '', active: true, createdAt: Date.now() });
  t1.supervisorId = sup1.id; t2.supervisorId = sup2.id;
  const mk = (name, parent, phone, country, t, total, rem, slots) => ({ id: uid(), createdAt: Date.now() - 3 * 86400000, duration: 30, link: '', name, parentName: parent, parentPhone: phone, country, teacherId: t.id, total, remaining: rem, status: rem > 0 ? 'paid' : 'expired', attended: total - rem, absent: 0, excused: 0, renewals: [], notes: '', slots, groupName: 'قرآن | ' + name });
  db.students.push(
    mk('عمر محمد', 'محمد علي', '01011111111', 'EG', t1, 8, 5, [{ day: 0, time: '17:00' }, { day: 3, time: '17:00' }]),
    mk('سارة فهد', 'فهد العتيبي', '0551111111', 'SA', t1, 8, 1, [{ day: 1, time: '19:00' }, { day: 4, time: '19:00' }]),
    mk('يوسف ناصر', 'ناصر الكندري', '99111111', 'KW', t2, 12, 9, [{ day: 2, time: '16:30' }, { day: 5, time: '10:00' }]),
    mk('ليان أحمد', 'أحمد المنصوري', '0501111111', 'AE', t2, 8, 0, [{ day: 6, time: '18:00' }]),
    mk('زيد خليل', 'خليل الزعبي', '0791111111', 'JO', t1, 8, 6, [{ day: 0, time: '20:00' }, { day: 2, time: '20:00' }]),
  );
  Store.save(); toast('تمت إضافة البيانات التجريبية'); go('students');
}

boot(IS_SUP ? 'supervisor' : 'admin').then(p => {
  if (IS_SUP) ME = Store.supervisor(p.id);
  window.WHO = IS_SUP ? { role: 'supervisor', id: ME.id, name: ME.name } : { role: 'admin', id: 'admin', name: 'المدير' };
  let pend = false;   // تحديث مباشر لما حد تاني يغيّر البيانات (بدون ما نقاطع كتابة أو نافذة مفتوحة)
  Store.onChange = () => { if (editing()) pend = true; else render(); };
  setInterval(() => { if (pend && !editing()) { pend = false; render(); } }, 1500);
  render();
}).catch(() => {});
