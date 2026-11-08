/* ===================== Qraan — صفحة المشرفة ===================== */
'use strict';

const ses = Session.get();
Store.load();
const S = () => Store.db.settings;
let me = ses?.role === 'supervisor' ? Store.supervisor(ses.id) : null;
if (!me || me.active === false) { Session.clear(); location.href = 'index.html'; }
else window.WHO = { role: 'supervisor', id: me.id, name: me.name };

const C = () => S().adminCountry;
let current = 'groups';
let statMonth = '';
const mine = r => effSupervisorId(Store.student(r.studentId)) === me.id;   // تقارير طلابي فقط (تتحدث مع أي تغيير من الإدارة)
const views = { groups: () => groupReportsView(C(), mine), stats };

function go(tab) { current = tab; $$('#nav button[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); render(); }
function render() {
  Store.load(); // أحدث بيانات (لو المحفظ سجّل من تبويب تاني)
  me = Store.supervisor(ses.id);
  if (!me || me.active === false) { Session.clear(); location.href = 'index.html'; return; }
  $('#main').innerHTML = views[current]();
  const n = groupReports().filter(r => mine(r) && r.group.status !== 'sent').length;
  $('#grpBadge').textContent = n; $('#grpBadge').classList.toggle('hidden', !n);
  $('#sideFoot').innerHTML = `${esc(me.name)}<br>${esc(S().academy)}`;
}
$$('#nav button[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));

/* =============== إحصائيات المحفظين =============== */
function stats() {
  const nowM = nowIn(C()).iso.slice(0, 7);
  if (!statMonth) statMonth = nowM;
  const months = [...new Set([nowM, ...Store.db.reports.map(r => repWhen(r, C()).iso.slice(0, 7))])].sort().reverse();
  const rows = teacherReportStats(C(), statMonth, mine, t => t.supervisorId === me.id).sort((a, b) => b.lectures - a.lectures);
  const tot = rows.reduce((o, x) => ({ l: o.l + x.lectures, r: o.r + x.reports, s: o.s + x.sent, w: o.w + x.ready }), { l: 0, r: 0, s: 0, w: 0 });
  return `
  <div class="topbar"><h2>المحفظين — المحاضرات والتقارير</h2>
    <select style="width:auto" onchange="statMonth=this.value;render()">${months.map(m => `<option value="${m}" ${m === statMonth ? 'selected' : ''}>${m === nowM ? 'الشهر الحالي — ' : ''}${m}</option>`).join('')}<option value="all" ${statMonth === 'all' ? 'selected' : ''}>كل الفترات</option></select></div>
  <p class="muted small">المحفظين التابعين لكِ: ${Store.db.teachers.filter(t => t.supervisorId === me.id).map(t => esc(t.name)).join('، ') || '—'}</p>
  <div class="stats">
    <div class="stat"><div class="n">${tot.l}</div><div class="l">محاضرات مسجلة</div></div>
    <div class="stat gold"><div class="n">${tot.r}</div><div class="l">تقارير مكتوبة</div></div>
    <div class="stat"><div class="n">${tot.s}</div><div class="l">اتبعت للجروبات</div></div>
    <div class="stat warn clickable" onclick="grp.tab='ready';go('groups')"><div class="n">${tot.w}</div><div class="l">في انتظار الإرسال ←</div></div>
  </div>
  ${rows.length ? `<div class="table-wrap"><table>
    <tr><th>المحفظ</th><th>المحاضرات</th><th>حضر</th><th>لم يحضر</th><th>تقارير مكتوبة</th><th>اتبعت للجروب</th><th>في الانتظار</th><th>حضر بدون تقرير</th></tr>
    ${rows.map(x => `<tr><td><b>${esc(x.t.name)}</b></td><td><b style="font-size:17px">${x.lectures}</b></td><td>${x.present}</td><td>${x.absent}</td>
      <td>${x.reports}</td><td>${x.sent}</td><td>${x.ready ? `<span class="pill warn">${x.ready}</span>` : '—'}</td><td>${x.noReport ? `<span class="pill danger">${x.noReport}</span>` : '—'}</td></tr>`).join('')}
  </table></div>` : '<div class="card empty">لا يوجد محفظين.</div>'}`;
}

if (me && me.active !== false) {
  render();
  setInterval(() => { if (!$('#modal') && document.visibilityState === 'visible' && !document.activeElement?.matches('input')) render(); }, 30000);
}
