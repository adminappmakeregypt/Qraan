/* ===================== Qraan — صفحة المحفظ ===================== */
'use strict';

const ses = Session.get();
const db = Store.load();
const S = db.settings;
const me = ses?.role === 'teacher' ? Store.teacher(ses.id) : null;
if (!me || me.active === false) { Session.clear(); location.href = 'index.html'; }

let current = 'students';
const views = { students, week, history };
function go(tab) { current = tab; $$('#nav button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); render(); }
function render() {
  $('#main').innerHTML = views[current]();
  $('#sideFoot').innerHTML = `${esc(me.name)}<br>${countryLabel(me.country)}`;
}
$$('#nav button[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
const myStudents = () => db.students.filter(s => s.teacherId === me.id);

/* =============== طلابي =============== */
function students() {
  const list = myStudents().sort((a, b) => {
    const na = nextSession(a, me.country), nb = nextSession(b, me.country);
    return (na ? na.d : 1e9) - (nb ? nb.d : 1e9);
  });
  const n = nowIn(me.country);
  return `
  <div class="topbar"><h2>أهلًا ${esc(me.name)}</h2><span class="muted">${DAYS[n.day]} — المواعيد بتوقيت ${countryLabel(me.country)}</span></div>
  ${list.length ? `<div class="cards">${list.map(card).join('')}</div>` : '<div class="card empty">لم يتم تعيين طلاب لك بعد.</div>'}`;
}
function card(s) {
  const active = isActive(s), nx = nextSession(s, me.country);
  return `<div class="scard ${active ? '' : 'expired'}">
    <div class="head"><div><div class="name">${esc(s.name)}</div><div class="muted small">${countryLabel(s.country)}</div></div>${statusPill(s)}</div>
    <div class="kv"><span>المحاضرات المتبقية</span><span><b>${s.remaining}</b> / ${s.total}</span></div>
    <div class="kv"><span>حضور / غياب</span><span>✅ ${s.attended || 0} · ❌ ${s.absent || 0} · 🟡 ${s.excused || 0}</span></div>
    ${active
      ? `<div class="kv"><span>الحلقة القادمة</span><span>${nx ? `${fmtSlot(nx)} <span class="muted small">(${inText(nx.d)})</span>` : '—'}</span></div>
         <div class="list-slots muted">${slotsIn(s, me.country).map(fmtSlot).join(' · ') || 'لا مواعيد محددة'}</div>
         <button class="btn" onclick="reportForm('${s.id}')">📝 رفع تقرير الحلقة</button>`
      : `<div class="note small" style="margin:0">انتهت الباقة — لا توجد حلقات قادمة حتى تجديد الاشتراك من الإدارة.</div>
         <button class="btn" disabled>📝 رفع تقرير الحلقة</button>`}
  </div>`;
}

function reportForm(id) {
  const s = Store.student(id);
  if (!isActive(s)) return toast('اشتراك الطالب منتهي', true);
  const today = nowIn(me.country).iso;
  openModal(`تقرير حلقة — ${esc(s.name)}`, `
    <form id="rf">
      <p class="muted small">رقم المحاضرة: <b>${s.total - s.remaining + 1}</b> من ${s.total} — المتبقي بعد التقرير: <b>${s.remaining - 1}</b>${s.remaining === 1 ? ' <span class="pill danger">آخر محاضرة</span>' : ''}</p>
      <div class="field"><label>الحضور</label>
        <div class="radio-row">
          <label><input type="radio" name="attendance" value="present" checked><span>✅ حاضر</span></label>
          <label><input type="radio" name="attendance" value="absent"><span>❌ غائب</span></label>
          <label><input type="radio" name="attendance" value="excused"><span>🟡 بعذر</span></label>
        </div>
        <p class="muted small" id="attHint"></p>
      </div>
      <div class="field"><label>تاريخ الحلقة</label><input type="date" name="date" value="${today}" required></div>
      <div id="lessonFields">
        <div class="field"><label>الحفظ الجديد</label><input name="memorized" placeholder="مثال: سورة النبأ من آية 1 إلى 16"></div>
        <div class="field"><label>المراجعة</label><input name="review" placeholder="مثال: جزء عمّ — من الناس إلى الفجر"></div>
        <div class="field"><label>التقييم</label><select name="grade">${GRADES.map(g => `<option>${g}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>ملاحظات لولي الأمر</label><textarea name="notes" style="min-height:70px"></textarea></div>
    </form>`,
    `<button class="btn" form="rf">رفع التقرير</button><button class="btn ghost" onclick="closeModal()">إلغاء</button>`);
  const f = $('#rf');
  const sync = () => {
    const a = f.attendance.value;
    $('#lessonFields').classList.toggle('hidden', a !== 'present');
    $('#attHint').textContent = a === 'excused' && !S.excusedCounts ? 'الغياب بعذر لا يُخصم من رصيد المحاضرات.' : 'سيتم خصم محاضرة من رصيد الطالب.';
  };
  f.addEventListener('change', sync); sync();
  f.onsubmit = e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (d.attendance === 'present' && !d.memorized.trim() && !d.review.trim()) return toast('اكتب الحفظ أو المراجعة', true);
    try {
      const { msgs } = submitReport(s, me, {
        date: d.date, attendance: d.attendance, memorized: (d.memorized || '').trim(), review: (d.review || '').trim(),
        grade: d.attendance === 'present' ? d.grade : '', notes: d.notes.trim(),
      });
      afterSubmit(s, msgs);
    } catch (err) { toast(err.message, true); }
  };
}

function afterSubmit(s, msgs) {
  const ended = msgs.some(m => m.kind === 'renew');
  const body = `
    <p>✅ تم حفظ التقرير. المحاضرات المتبقية: <b>${s.remaining}</b></p>
    ${ended ? '<div class="note">كانت هذه آخر محاضرة في الباقة — تم إيقاف الحلقات القادمة وإضافة رسالة تذكير بالاشتراك لولي الأمر.</div>' : ''}
    ${msgs.map(m => `<div style="margin-bottom:10px">${kindPill(m.kind)}<div class="msg-preview" style="margin-top:6px">${esc(m.text)}</div>
      ${S.teacherCanSend ? `<button class="btn sm wa" style="margin-top:6px" onclick="sendWhatsApp('${m.id}');this.disabled=true;this.textContent='تم الفتح في واتساب'">إرسال لولي الأمر</button>` : ''}</div>`).join('')}
    ${S.teacherCanSend ? '' : '<p class="muted small">الرسائل أُضيفت لصندوق الإرسال وسيتم إرسالها من رقم واتساب الأكاديمية.</p>'}`;
  openModal('تم رفع التقرير', body, `<button class="btn" onclick="closeModal();render()">تم</button>`);
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') render(); });
}

/* =============== جدولي =============== */
function week() {
  const n = nowIn(me.country);
  const days = DAYS.map(() => []);
  myStudents().filter(isActive).forEach(st => slotsIn(st, me.country).forEach(x => days[x.day].push({ st, x })));
  days.forEach(d => d.sort((a, b) => slotMin(a.x) - slotMin(b.x)));
  return `
  <div class="topbar"><h2>جدولي الأسبوعي</h2><span class="muted">بتوقيت ${countryLabel(me.country)}</span></div>
  <div class="week">${days.map((list, i) => `<div class="day ${i === n.day ? 'today' : ''}"><h4>${DAYS[i]}</h4>
    ${list.map(({ st, x }) => `<div class="slot"><b>${fmtTime(x.time)}</b>${esc(st.name)}<div class="muted small">${COUNTRIES[st.country].flag} ${st.country !== me.country ? `عنده ${fmtTime(convertSlot(x, me.country, st.country).time)}` : ''}</div></div>`).join('') || '<div class="empty small">—</div>'}
  </div>`).join('')}</div>`;
}

/* =============== تقاريري =============== */
function history() {
  const reps = db.reports.filter(r => r.teacherId === me.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
  return `
  <div class="topbar"><h2>تقاريري</h2></div>
  ${reps.length ? `<div class="table-wrap"><table><tr><th>التاريخ</th><th>الطالب</th><th>الحضور</th><th>الحفظ</th><th>المراجعة</th><th>التقييم</th><th>المتبقي</th></tr>
    ${reps.map(r => `<tr><td>${esc(r.date)}</td><td>${esc(Store.student(r.studentId)?.name || '—')}</td><td>${ATT[r.attendance]}</td>
      <td class="small">${esc(r.memorized || '—')}</td><td class="small">${esc(r.review || '—')}</td><td>${esc(r.grade || '—')}</td><td>${r.remainingAfter}</td></tr>`).join('')}
  </table></div>` : '<div class="card empty">لم ترفع تقارير بعد.</div>'}`;
}

if (me && me.active !== false) render();
