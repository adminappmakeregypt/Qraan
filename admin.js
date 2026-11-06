/* ===================== Qraan — لوحة المدير ===================== */
'use strict';

if (Session.get()?.role !== 'admin') location.href = 'index.html';
const db = Store.load();
const S = db.settings;
let current = 'dashboard';
const filters = { teacher: '', status: '', country: '', q: '' };

const views = { dashboard, assign, teachers, students, schedule, reports, outbox, settings };

function go(tab) {
  current = tab;
  $$('#nav button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}
function render() {
  $('#main').innerHTML = views[current]();
  const pending = db.outbox.filter(m => m.status === 'pending').length;
  $('#outBadge').textContent = pending; $('#outBadge').classList.toggle('hidden', !pending);
  $('#sideFoot').innerHTML = `${esc(S.academy)}<br>${esc(S.adminEmail)}`;
}
$$('#nav button[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
const teacherName = id => esc(Store.teacher(id)?.name || '— بدون محفظ —');
const teacherOptions = (sel, withEmpty = true) =>
  (withEmpty ? '<option value="">— اختر —</option>' : '') +
  db.teachers.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('');

/* =============== الرئيسية =============== */
function dashboard() {
  const active = db.students.filter(isActive);
  const expired = db.students.filter(s => !isActive(s));
  const low = active.filter(s => s.remaining <= 2);
  const todayIso = nowIn(S.adminCountry).iso;
  const todayReports = db.reports.filter(r => repWhen(r, S.adminCountry).iso === todayIso);
  const pending = db.outbox.filter(m => m.status === 'pending');

  // حلقات اليوم بتوقيت المدير
  const n = nowIn(S.adminCountry);
  const today = db.teachers.flatMap(t => teacherSessions(t.id, S.adminCountry, 0, 0)).sort((a, b) => a.ts - b.ts);

  return `
  <div class="topbar"><h2>السلام عليكم 👋</h2><span class="muted">${DAYS[n.day]} — التوقيت: ${countryLabel(S.adminCountry)}</span></div>
  <div class="stats">
    <div class="stat"><div class="n">${db.teachers.length}</div><div class="l">محفظ</div></div>
    <div class="stat"><div class="n">${active.length}</div><div class="l">طالب اشتراكه مدفوع</div></div>
    <div class="stat danger"><div class="n">${expired.length}</div><div class="l">اشتراك منتهي</div></div>
    <div class="stat warn"><div class="n">${low.length}</div><div class="l">قارب على الانتهاء (≤ 2)</div></div>
    <div class="stat gold clickable" onclick="go('reports')"><div class="n">${todayReports.length}</div><div class="l">محاضرات سُجلت اليوم ←</div></div>
    <div class="stat"><div class="n">${pending.length}</div><div class="l">رسائل في انتظار الإرسال</div></div>
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
          <td><button class="btn sm gold" onclick="renewForm('${s.id}')">تجديد</button></td></tr>`).join('')}
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
  const list = db.teachers.filter(t => !q || (t.name + ' ' + t.username).toLowerCase().includes(q));
  return `<aside class="tlist">
    <input placeholder="🔍 ابحث عن محفظ (${db.teachers.length})" value="${esc(asg.q)}" oninput="asg.q=this.value;refreshTList()">
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
  if (!db.teachers.length) return '<div class="topbar"><h2>الجدول والحصص</h2></div><div class="card empty">أضف محفظًا أولًا من صفحة المحفظين.</div>';
  if (!Store.teacher(asg.teacher)) asg.teacher = db.teachers[0].id;
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
  const mine = db.students.filter(s => s.teacherId === teacherId), others = db.students.filter(s => s.teacherId !== teacherId);
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
        <div class="row"><div class="field"><label>عدد محاضرات الباقة</label><input name="ntotal" type="number" min="1" value="${S.defaultLectures}"></div>
          <div class="field"><label>مدة الحصة (دقيقة)</label><input name="ndur" type="number" min="10" step="5" value="30"></div></div>
      </div>
      <div class="row3">
        <div class="field"><label>اليوم</label><select name="day">${DAYS.map((d, i) => `<option value="${i}" ${i === cur.day ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label>الساعة</label><input type="time" name="time" value="${cur.time}" required></div>
        <div class="field"><label>بأي توقيت؟</label><select name="base"></select></div>
      </div>
      <div id="smPrev"></div>
      <div class="field"><label><input type="checkbox" name="send" style="width:auto" checked> إرسال المواعيد لولي الأمر</label></div>
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
        notes: '', link: '', duration: Math.max(10, +f.ndur.value || 30), slots: [] };
      db.students.push(st);
    } else if (st.teacherId !== t.id) st.teacherId = t.id;
    const p = tzPreview(st, t, f.day.value, f.time.value, f.base.value, false, null);
    const ns = convertSlot(p.slot, p.bc, st.country);
    if ((st.slots || []).some((s, i) => s.day === ns.day && s.time === ns.time && i !== slotIdx)) return toast('هذا الموعد موجود بالفعل', true);
    if (editing) st.slots[slotIdx] = { day: ns.day, time: ns.time, since: Date.now() };
    else (st.slots ||= []).push({ day: ns.day, time: ns.time, since: Date.now() });
    Store.save();
    if (f.send.checked && isActive(st)) queueSchedule(st);
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
      <div class="field"><label><input type="checkbox" name="send" style="width:auto" checked> إبلاغ ولي الأمر</label></div>
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
    if (f.send.checked) {
      const l = localOf(p.ts, st.country);
      queueMessage('schedule', st, fill(S.tplExtra, msgVars(st, { dayname: DAYS[l.day], date: l.iso, time: fmtTime(l.time) })));
      Store.save();
    }
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
  const candidates = db.students.filter(s => s.teacherId !== toTeacher);
  openModal(st ? `نقل ${esc(st.name)} لمحفظ آخر` : 'تعيين طالب حالي لهذا المحفظ', `
    <form id="mvf">
      ${st ? '' : `<div class="field"><label>الطالب</label><select name="sid" required><option value="">— اختر —</option>
        ${candidates.map(s => `<option value="${s.id}">${esc(s.name)} — ${s.teacherId ? 'حاليًا مع ' + teacherName(s.teacherId) : 'بدون محفظ'}</option>`).join('')}</select></div>`}
      <div class="field"><label>المحفظ الجديد</label><select name="tid" required>${db.teachers.filter(x => !st || x.id !== st.teacherId).map(x => `<option value="${x.id}" ${x.id === toTeacher ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <p class="muted small">المحاضرات المسجلة سابقًا تبقى في سجل المحفظ القديم. المواعيد تنتقل كما هي.</p>
      <div class="field"><label><input type="checkbox" name="send" style="width:auto" checked> إرسال المواعيد لولي الأمر باسم المحفظ الجديد</label></div>
    </form>`,
    `<button class="btn" form="mvf">حفظ</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  $('#mvf').onsubmit = e => {
    e.preventDefault();
    const s2 = st || Store.student(e.target.sid.value);
    if (!s2) return toast('اختر الطالب', true);
    s2.teacherId = e.target.tid.value; Store.save();
    if (e.target.send.checked && isActive(s2) && s2.slots?.length) queueSchedule(s2);
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
  ${db.teachers.length ? `<div class="table-wrap"><table>
    <tr><th>الاسم</th><th>اسم المستخدم</th><th>رقم الدخول</th><th>البلد</th><th>الهاتف</th><th>الطلاب</th><th>محاضرات الشهر</th><th>إجمالي المحاضرات</th><th>الحالة</th><th></th></tr>
    ${db.teachers.map(t => {
      const sts = db.students.filter(s => s.teacherId === t.id), ts = teacherStats(t.id, S.adminCountry);
      return `<tr><td><b>${esc(t.name)}</b></td><td dir="ltr" style="text-align:right">${esc(t.username)}</td><td><code>${esc(t.code)}</code></td>
      <td>${countryLabel(t.country)}</td><td dir="ltr" style="text-align:right">${esc(t.phone || '—')}</td>
      <td>${sts.filter(isActive).length} نشط / ${sts.length}</td>
      <td><b>${ts.month}</b></td><td>${ts.total} <span class="muted small">(✅ ${ts.present} · ❌ ${ts.absent})</span></td>
      <td>${t.active === false ? '<span class="pill gray">موقوف</span>' : '<span class="pill ok">فعال</span>'}</td>
      <td><div class="actions">
        <button class="btn sm ghost" onclick="teacherForm('${t.id}')">تعديل</button>
        <button class="btn sm ghost" onclick="filters.teacher='${t.id}';go('students')">طلابه</button>
        <button class="btn sm ghost" onclick="lec.teacher='${t.id}';go('reports')">محاضراته</button>
        <button class="btn sm" onclick="asg.teacher='${t.id}';go('assign')">الجدول</button>
        <button class="btn sm danger" onclick="delTeacher('${t.id}')">حذف</button></div></td></tr>`;
    }).join('')}
  </table></div>` : '<div class="card empty">لا يوجد محفظين بعد — ابدأ بإضافة أول محفظ.</div>'}`;
}

function teacherForm(id) {
  const t = id ? Store.teacher(id) : { name: '', username: '', code: String(Math.floor(1000 + Math.random() * 9000)), country: 'EG', phone: '', active: true };
  openModal(id ? 'تعديل محفظ' : 'إضافة محفظ', `
    <form id="tf">
      <div class="field"><label>الاسم</label><input name="name" required value="${esc(t.name)}"></div>
      <div class="row">
        <div class="field"><label>اسم المستخدم (للدخول)</label><input name="username" required dir="ltr" value="${esc(t.username)}"></div>
        <div class="field"><label>رقم الدخول (بدون كلمة سر)</label><input name="code" required inputmode="numeric" pattern="[0-9]{3,10}" value="${esc(t.code)}"></div>
      </div>
      <div class="row">
        <div class="field"><label>البلد</label><select name="country">${countryOptions(t.country)}</select></div>
        <div class="field"><label>الهاتف</label><input name="phone" value="${esc(t.phone)}"></div>
      </div>
      <div class="field"><label><input type="checkbox" name="active" style="width:auto" ${t.active !== false ? 'checked' : ''}> الحساب فعال</label></div>
    </form>`,
    `<button class="btn" form="tf">حفظ</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  $('#tf').onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const uname = f.username.trim();
    if (db.teachers.some(x => x.id !== id && x.username.toLowerCase() === uname.toLowerCase())) return toast('اسم المستخدم مستخدم بالفعل', true);
    const data = { name: f.name.trim(), username: uname, code: f.code.trim(), country: f.country, phone: f.phone.trim(), active: !!f.active };
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

/* =============== الطلاب =============== */
function students() {
  const q = filters.q.trim().toLowerCase();
  const list = db.students.filter(s =>
    (!filters.teacher || s.teacherId === filters.teacher) &&
    (!filters.country || s.country === filters.country) &&
    (!filters.status || (filters.status === 'paid' ? isActive(s) : !isActive(s))) &&
    (!q || (s.name + ' ' + s.parentName + ' ' + s.parentPhone).toLowerCase().includes(q)));
  return `
  <div class="topbar"><h2>الطلاب</h2><button class="btn" onclick="studentForm()" ${db.teachers.length ? '' : 'disabled title="أضف محفظًا أولًا"'}>+ إضافة طالب</button></div>
  <div class="toolbar">
    <input placeholder="بحث بالاسم أو ولي الأمر أو الهاتف" value="${esc(filters.q)}" oninput="filters.q=this.value;debounceRender()">
    <select onchange="filters.teacher=this.value;render()"><option value="">كل المحفظين</option>${teacherOptions(filters.teacher, false)}</select>
    <select onchange="filters.status=this.value;render()">
      <option value="">كل الحالات</option><option value="paid" ${filters.status === 'paid' ? 'selected' : ''}>مدفوع</option><option value="expired" ${filters.status === 'expired' ? 'selected' : ''}>منتهي</option></select>
    <select onchange="filters.country=this.value;render()"><option value="">كل الدول</option>${countryOptions(filters.country)}</select>
  </div>
  ${list.length ? `<div class="table-wrap"><table>
    <tr><th>الطالب</th><th>ولي الأمر</th><th>المحفظ</th><th>المواعيد (توقيت الطالب)</th><th>المتبقي</th><th>الحضور</th><th>الاشتراك</th><th></th></tr>
    ${list.map(s => `<tr>
      <td><b>${esc(s.name)}</b><div class="muted small">${countryLabel(s.country)}</div></td>
      <td>${esc(s.parentName || '—')}<div class="small" dir="ltr" style="text-align:right">${esc(s.parentPhone)}</div></td>
      <td>${teacherName(s.teacherId)}</td>
      <td><div class="list-slots">${isActive(s) ? (slotsIn(s, s.country).map(x => `<span>${fmtSlot(x)}</span>`).join('') || '<span class="muted">لا مواعيد</span>') : '<span class="muted">موقوفة لحين التجديد</span>'}</div></td>
      <td>${meter(s)}</td>
      <td class="small">✅ ${s.attended || 0}<br>❌ ${s.absent || 0}<br>🟡 ${s.excused || 0}</td>
      <td>${statusPill(s)}</td>
      <td><div class="actions">
        <button class="btn sm ghost" onclick="studentForm('${s.id}')">تعديل</button>
        <button class="btn sm gold" onclick="renewForm('${s.id}')">تجديد</button>
        <button class="btn sm ghost" onclick="sendSchedule('${s.id}')">إرسال المواعيد</button>
        <button class="btn sm ghost" onclick="studentLog('${s.id}')">السجل</button>
        <button class="btn sm danger" onclick="delStudent('${s.id}')">حذف</button></div></td>
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
      <div class="field"><label>المحفظ</label><select name="teacherId" required>${teacherOptions(s.teacherId)}</select></div>
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
      ${id ? '' : '<div class="field"><label><input type="checkbox" name="sendSched" style="width:auto" checked> إضافة رسالة المواعيد لولي الأمر في صندوق الرسائل</label></div>'}
    </form>`,
    `<button class="btn" form="sf">حفظ</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  const f = $('#sf');
  f.addEventListener('input', slotPreview); f.addEventListener('change', slotPreview); slotPreview();
  f.onsubmit = e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const data = {
      name: d.name.trim(), parentName: d.parentName.trim(), parentPhone: d.parentPhone.trim(), country: d.country, teacherId: d.teacherId,
      total: Math.max(1, +d.total || 1), remaining: Math.max(0, +d.remaining || 0), notes: d.notes.trim(), slots: readSlots(),
      link: d.link.trim(), duration: Math.max(10, +d.duration || 30),
    };
    if (!id || JSON.stringify(s.slots) !== JSON.stringify(data.slots)) data.slotsAt = Date.now();
    data.status = data.remaining <= 0 ? 'expired' : d.status;
    let st;
    if (id) { st = Object.assign(s, data); }
    else { st = { id: uid(), createdAt: Date.now(), attended: 0, absent: 0, excused: 0, renewals: [], ...data }; db.students.push(st); }
    Store.save();
    if (!id && d.sendSched && st.slots.length && isActive(st)) queueSchedule(st);
    closeModal(); toast('تم الحفظ'); render();
  };
}

function renewForm(id) {
  const s = Store.student(id);
  openModal(`تجديد اشتراك — ${esc(s.name)}`, `
    <form id="rf">
      <p class="muted">المتبقي حاليًا: <b>${s.remaining}</b> — الحالة: ${statusPill(s)}</p>
      <div class="field"><label>عدد محاضرات الباقة الجديدة</label><input name="n" type="number" min="1" value="${s.total || S.defaultLectures}" required></div>
      <div class="field"><label><input type="checkbox" name="sched" style="width:auto" ${s.slots?.length ? 'checked' : ''}> إرسال المواعيد لولي الأمر بعد التجديد</label></div>
    </form>`,
    `<button class="btn gold" form="rf">تأكيد الدفع والتجديد</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  $('#rf').onsubmit = e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    renewStudent(s, d.n);
    if (d.sched && s.slots?.length) queueSchedule(s);
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
  db.students.filter(isActive).filter(s => !schedTeacher || s.teacherId === schedTeacher)
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
  const all = db.reports.map(r => ({ r, w: repWhen(r, C) }));
  const months = [...new Set([nowM, ...all.map(x => x.w.iso.slice(0, 7))])].sort().reverse();
  const inMonth = lec.month === 'all' ? all : all.filter(x => x.w.iso.startsWith(lec.month));
  const now = Date.now();

  // ملخص كل المحفظين
  const q = lec.q.trim().toLowerCase();
  let sum = db.teachers.filter(t => !q || t.name.toLowerCase().includes(q)).map(t => {
    const rs = inMonth.filter(x => x.r.teacherId === t.id);
    const p = rs.filter(x => x.r.attendance === 'present').length;
    const missed = lec.month === nowM ? teacherSessions(t.id, C, 31, 0).filter(o => !o.rec && o.ts < now && o.date.startsWith(nowM)).length : 0;
    const last = rs.sort((a, b) => (b.r.sessionTs || b.r.createdAt) - (a.r.sessionTs || a.r.createdAt))[0];
    return { t, n: rs.length, p, a: rs.length - p, missed, students: new Set(rs.map(x => x.r.studentId)).size, last: last ? last.w : null,
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
    <tr><th>المحفظ</th><th>طلاب نشطين</th><th>المحاضرات المسجلة</th><th>حضر</th><th>لم يحضر</th><th>لم تُسجل</th><th>آخر محاضرة</th><th></th></tr>
    ${sum.map(x => `<tr class="${x.t.id === lec.teacher ? 'sel' : ''}"><td><b>${esc(x.t.name)}</b><div class="muted small">${countryLabel(x.t.country)}</div></td><td>${x.active}</td>
      <td><b style="font-size:17px">${x.n}</b></td><td>${x.p}</td><td>${x.a}</td>
      <td>${x.missed ? `<span class="pill warn">${x.missed}</span>` : '—'}</td>
      <td class="small">${x.last ? `${fmtDayDate(x.last.iso)}${x.last.time ? ' ' + fmtTime(x.last.time) : ''}` : '—'}</td>
      <td><button class="btn sm ${x.t.id === lec.teacher ? '' : 'ghost'}" onclick="pickLec('${x.t.id}')">التفاصيل</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">لا نتائج</td></tr>'}
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
  try { const { rep } = recordSession(o.st, Store.teacher(o.st.teacherId), o, att); rep.byAdmin = true; Store.save(); toast('تم التسجيل'); render(); }
  catch (e) { toast(e.message, true); }
}
function adminUndo(id) {
  if (!confirmBox('حذف تسجيل المحاضرة وإرجاعها لرصيد الطالب؟')) return;
  undoSession(id); toast('تم الحذف'); render();
}
function exportLectures() {
  const C = S.adminCountry;
  const rows = [['التاريخ', 'الوقت', 'المحفظ', 'الطالب', 'الحضور', 'رقم المحاضرة', 'المتبقي']];
  db.reports.filter(r => (!lec.teacher || r.teacherId === lec.teacher) && (!lec.student || r.studentId === lec.student))
    .map(r => ({ r, w: repWhen(r, C) })).filter(x => !lec.month || lec.month === 'all' || x.w.iso.startsWith(lec.month))
    .sort((a, b) => (a.r.sessionTs || a.r.createdAt) - (b.r.sessionTs || b.r.createdAt))
    .forEach(({ r, w }) => rows.push([w.iso, w.time, Store.teacher(r.teacherId)?.name || '', Store.student(r.studentId)?.name || '', ATT[r.attendance], r.lectureNo || '', r.remainingAfter]));
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `qraan-lectures-${lec.month || 'all'}.csv`; a.click();
}

/* =============== صندوق رسائل واتساب =============== */
let outTab = 'pending';
function outbox() {
  const list = db.outbox.filter(m => m.status === outTab).sort((a, b) => outTab === 'pending' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
  const pc = db.outbox.filter(m => m.status === 'pending').length;
  return `
  <div class="topbar"><h2>رسائل واتساب</h2>
    <div class="seg" style="margin:0;min-width:260px"><button class="${outTab === 'pending' ? 'active' : ''}" onclick="outTab='pending';render()">في الانتظار (${pc})</button><button class="${outTab === 'sent' ? 'active' : ''}" onclick="outTab='sent';render()">المُرسلة</button></div></div>
  <div class="note">افتح هذه الصفحة من الجهاز المسجل عليه واتساب الأكاديمية ${S.whatsapp ? `(<span dir="ltr">${esc(S.whatsapp)}</span>)` : ''} — زر «إرسال» يفتح المحادثة مع ولي الأمر والرسالة جاهزة، اضغط إرسال في واتساب.</div>
  ${list.length ? list.map(m => `<div class="card">
      <div class="topbar" style="margin-bottom:8px"><div>${kindPill(m.kind)} <b>${esc(m.studentName)}</b> <span class="muted small" dir="ltr">+${esc(m.phone)}</span></div>
      <span class="muted small">${fmtDateTime(m.sentAt || m.createdAt)}</span></div>
      <div class="msg-preview">${esc(m.text)}</div>
      <div class="actions" style="display:flex;gap:6px;margin-top:10px">
        <button class="btn sm wa" onclick="sendWhatsApp('${m.id}');render()">${m.status === 'sent' ? 'إعادة الإرسال' : 'إرسال عبر واتساب'}</button>
        ${m.status === 'pending' ? `<button class="btn sm ghost" onclick="markSent('${m.id}');render()">تم الإرسال يدويًا</button>` : ''}
        <button class="btn sm ghost" onclick="navigator.clipboard.writeText(${esc(JSON.stringify(m.text))}).then(()=>toast('تم النسخ'))">نسخ</button>
        <button class="btn sm danger" onclick="delMsg('${m.id}')">حذف</button>
      </div></div>`).join('') : '<div class="card empty">لا توجد رسائل.</div>'}`;
}
function delMsg(id) { db.outbox = db.outbox.filter(m => m.id !== id); Store.save(); render(); }

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
    <div class="field"><label><input type="checkbox" name="teacherCanSend" style="width:auto" ${S.teacherCanSend ? 'checked' : ''}> السماح للمحفظ بإرسال التقرير من واتساب هاتفه مباشرة</label></div>
    <h3 style="margin-top:10px">قوالب الرسائل</h3>
    <p class="muted small">المتغيرات: {student} {parent} {teacher} {dayname} {date} {time} {attendance} {remaining} {total} {schedule} {country} {academy}</p>
    <div class="field"><label>رسالة الحضور (بعد كل محاضرة)</label><textarea name="tplSession" rows="8">${esc(S.tplSession)}</textarea></div>
    <div class="field"><label>رسالة تذكير الاشتراك (مع آخر محاضرة)</label><textarea name="tplRenew" rows="6">${esc(S.tplRenew)}</textarea></div>
    <div class="field"><label>رسالة المحاضرة الإضافية</label><textarea name="tplExtra" rows="5">${esc(S.tplExtra)}</textarea></div>
    <div class="field"><label>رسالة المواعيد</label><textarea name="tplSchedule" rows="6">${esc(S.tplSchedule)}</textarea></div>
    <button class="btn">حفظ الإعدادات</button>
  </form>
  <form id="pwf" class="card">
    <h3>بيانات دخول المدير</h3>
    <div class="row">
      <div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" value="${esc(S.adminEmail)}" required></div>
      <div class="field"><label>كلمة المرور الحالية</label><input name="old" type="password" required></div>
    </div>
    <div class="field"><label>كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)</label><input name="pw" type="password" minlength="6"></div>
    <button class="btn">تحديث</button>
  </form>
  <div class="card">
    <h3>النسخ الاحتياطي</h3>
    <p class="muted small">البيانات محفوظة في هذا المتصفح. خذ نسخة احتياطية بانتظام.</p>
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
      defaultLectures: Math.max(1, +d.defaultLectures || 8), absentCounts: !!d.absentCounts, teacherCanSend: !!d.teacherCanSend,
      tplSession: d.tplSession, tplExtra: d.tplExtra, tplRenew: d.tplRenew, tplSchedule: d.tplSchedule,
    });
    Store.save(); toast('تم حفظ الإعدادات'); render();
  }
  if (e.target.id === 'pwf') {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    if (await sha256(d.old) !== S.adminHash) return toast('كلمة المرور الحالية غير صحيحة', true);
    S.adminEmail = d.email.trim().toLowerCase();
    if (d.pw) S.adminHash = await sha256(d.pw);
    Store.save(); toast('تم التحديث'); render();
  }
});

function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = `qraan-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
}
function importData(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d.settings || !Array.isArray(d.students)) throw 0;
      if (!confirmBox('سيتم استبدال كل البيانات الحالية. متابعة؟')) return;
      localStorage.setItem(DB_KEY, JSON.stringify(d)); location.reload();
    } catch { toast('ملف غير صالح', true); }
  };
  r.readAsText(file);
}
function resetAll() {
  if (!confirmBox('سيتم حذف كل البيانات نهائيًا بما فيها حساب المدير. متابعة؟')) return;
  localStorage.removeItem(DB_KEY); logout();
}
function loadDemo() {
  if (db.students.length && !confirmBox('سيتم إضافة بيانات تجريبية إلى بياناتك الحالية. متابعة؟')) return;
  const t1 = { id: uid(), name: 'الشيخ أحمد سالم', username: 'ahmed', code: '1234', country: 'EG', phone: '01000000000', active: true, createdAt: Date.now() };
  const t2 = { id: uid(), name: 'الأستاذة مريم خالد', username: 'mariam', code: '5678', country: 'SA', phone: '0500000000', active: true, createdAt: Date.now() };
  db.teachers.push(t1, t2);
  const mk = (name, parent, phone, country, t, total, rem, slots) => ({ id: uid(), createdAt: Date.now() - 3 * 86400000, duration: 30, link: '', name, parentName: parent, parentPhone: phone, country, teacherId: t.id, total, remaining: rem, status: rem > 0 ? 'paid' : 'expired', attended: total - rem, absent: 0, excused: 0, renewals: [], notes: '', slots });
  db.students.push(
    mk('عمر محمد', 'محمد علي', '01011111111', 'EG', t1, 8, 5, [{ day: 0, time: '17:00' }, { day: 3, time: '17:00' }]),
    mk('سارة فهد', 'فهد العتيبي', '0551111111', 'SA', t1, 8, 1, [{ day: 1, time: '19:00' }, { day: 4, time: '19:00' }]),
    mk('يوسف ناصر', 'ناصر الكندري', '99111111', 'KW', t2, 12, 9, [{ day: 2, time: '16:30' }, { day: 5, time: '10:00' }]),
    mk('ليان أحمد', 'أحمد المنصوري', '0501111111', 'AE', t2, 8, 0, [{ day: 6, time: '18:00' }]),
    mk('زيد خليل', 'خليل الزعبي', '0791111111', 'JO', t1, 8, 6, [{ day: 0, time: '20:00' }, { day: 2, time: '20:00' }]),
  );
  Store.save(); toast('تمت إضافة البيانات التجريبية'); go('students');
}

render();
