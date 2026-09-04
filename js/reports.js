/* ============================================================
   Отчёты.
   Лидер: одна форма, фракция залочена на его собственную,
          в списке — только отчёты его фракции.
   Админ:  переключатель «Государственные / Криминальные»,
          выбор любой фракции нужной стороны, удаление.
   Запрос лидера идёт с where('faction'==...), иначе его
   зарежут Firestore Security Rules.
   ============================================================ */

let reportsCache = null;

async function loadReports(force = false){
  if (reportsCache && !force) return reportsCache;
  if (!currentUser) return [];

  try {
    let query = db.collection('reports');
    if (currentUser.role === 'leader'){
      // ВАЖНО: без этого where правила безопасности не пропустят запрос.
      // orderBy тут не добавляем — иначе Firestore потребует составной индекс.
      query = query.where('faction', '==', currentUser.faction);
    } else {
      query = query.orderBy('timestamp', 'desc');
    }
    const snap = await query.get();
    let arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (currentUser.role === 'leader'){
      arr.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    }
    reportsCache = arr;
    return arr;
  } catch (err){
    console.error('Ошибка загрузки отчётов:', err);
    toast('Не удалось загрузить отчёты', 'error');
    return reportsCache || [];
  }
}

async function refreshReports(){
  await loadReports(true);
  renderReports();
}

/* Сторона отчёта: берём сохранённое поле side, а для старых
   отчётов без него — выводим из текущих данных форума. */
function reportSideOf(r){
  if (r.side === 'gov' || r.side === 'crime') return r.side;
  if (leaderData && leaderData[r.faction]) return factionSide(r.faction);
  return 'crime';
}

async function renderReports(){
  if (!currentUser) return;
  const list = document.getElementById('reportsList');
  const start = document.getElementById('reportFilterStart').value;
  const end = document.getElementById('reportFilterEnd').value;

  let reports = await loadReports();

  if (currentUser.role === 'admin'){
    reports = reports.filter(r => reportSideOf(r) === ui.reportSide);
    const my = getMyFactions();
    if (my.length) reports = reports.filter(r => my.includes(r.faction));
  }
  if (start) reports = reports.filter(r => r.date >= start);
  if (end)   reports = reports.filter(r => r.date <= end);

  document.getElementById('reportsCount').textContent = reports.length;

  if (reports.length === 0){
    list.innerHTML = '<div class="empty-state">Отчётов пока нет. Первый появится здесь сразу после сохранения.</div>';
    return;
  }

  const isAdmin = currentUser.role === 'admin';
  list.innerHTML = reports.map(r => `
    <div class="report-item">
      <div class="r-top">
        <div>
          <div class="r-name">${escapeHtml(r.name)} — ${escapeHtml(r.faction)}</div>
          <div class="r-meta">${escapeHtml(r.date)}${isAdmin && r.authorEmail ? ' &middot; ' + escapeHtml(r.authorEmail) : ''}</div>
        </div>
        ${isAdmin ? `<button class="r-delete" data-id="${escapeHtml(r.id)}">Удалить</button>` : ''}
      </div>
      ${r.problems ? `<div class="r-field"><b>Проблемы:</b> ${escapeHtml(r.problems)}</div>` : ''}
      ${r.improvements ? `<div class="r-field"><b>Улучшения:</b> ${escapeHtml(r.improvements)}</div>` : ''}
      ${r.comment ? `<div class="r-field"><b>Комментарий:</b> ${escapeHtml(r.comment)}</div>` : ''}
    </div>`).join('');
}

/* ---------- форма ---------- */

function initReportForm(){
  if (!currentUser) return;
  const seg = document.getElementById('reportSideSeg');
  const select = document.getElementById('reportFaction');
  const title = document.getElementById('reportFormTitle');
  const dateInput = document.getElementById('reportDate');
  if (!dateInput.value) dateInput.value = todayISO();

  if (currentUser.role === 'leader'){
    seg.hidden = true;
    title.textContent = `Новый отчёт — ${currentUser.faction}`;
    select.innerHTML = `<option value="${escapeHtml(currentUser.faction)}">${escapeHtml(currentUser.faction)}</option>`;
    select.disabled = true;
    updateLeaderName();
    return;
  }

  // админ
  seg.hidden = false;
  title.textContent = ui.reportSide === 'gov'
    ? 'Новый отчёт — государственная фракция'
    : 'Новый отчёт — криминальная фракция';

  if (!leaderData){
    select.innerHTML = '<option value="">Данные загружаются…</option>';
    return;
  }
  const factions = Object.keys(leaderData)
    .filter(k => factionSide(k) === ui.reportSide)
    .sort((a, b) => a.localeCompare(b));
  select.innerHTML = factions
    .map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`)
    .join('');
  select.disabled = false;
  updateLeaderName();
}

function setReportSide(side){
  if (currentUser.role !== 'admin') return;
  ui.reportSide = side;
  document.querySelectorAll('#reportSideSeg .seg-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.side === side));
  initReportForm();
  renderReports();
}

/* Автоподстановка ника лидера из данных форума */
function updateLeaderName(){
  const faction = currentUser.role === 'leader'
    ? currentUser.faction
    : document.getElementById('reportFaction').value;
  const input = document.getElementById('reportName');
  const nickname = leaderData?.[faction]?.nickname;
  input.value = (nickname && nickname !== '-') ? nickname : '';
}

/* ---------- сохранение и удаление ---------- */

async function saveReport(){
  const btn = document.getElementById('saveReportBtn');
  const faction = currentUser.role === 'leader'
    ? currentUser.faction
    : document.getElementById('reportFaction').value;
  const name = document.getElementById('reportName').value.trim();
  const date = document.getElementById('reportDate').value;
  const problems = document.getElementById('reportProblems').value.trim();
  const improvements = document.getElementById('reportImprovements').value.trim();
  const comment = document.getElementById('reportComment').value.trim();

  if (!faction || !name || !date){
    toast('Заполните фракцию, имя лидера и дату', 'error');
    return;
  }

  btn.classList.add('loading');
  try {
    await db.collection('reports').add({
      faction,
      name,
      date,
      problems,
      improvements,
      comment,
      side: leaderData ? factionSide(faction) : (currentUser.role === 'admin' ? ui.reportSide : 'crime'),
      authorEmail: currentUser.email,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    ['reportProblems', 'reportImprovements', 'reportComment'].forEach(id =>
      document.getElementById(id).value = '');
    document.getElementById('reportDate').value = todayISO();
    toast('Отчёт сохранён');
    await refreshReports();
  } catch (err){
    console.error('Ошибка сохранения отчёта:', err);
    toast('Не удалось сохранить: ' + (err.message || 'нет прав'), 'error');
  } finally {
    btn.classList.remove('loading');
  }
}

async function deleteReport(id){
  if (currentUser.role !== 'admin'){
    toast('Удалять отчёты может только администратор', 'error');
    return;
  }
  const ok = await confirmDialog({
    title: 'Удалить отчёт?',
    text: 'Отчёт будет удалён безвозвратно.',
    okText: 'Удалить'
  });
  if (!ok) return;

  try {
    await db.collection('reports').doc(id).delete();
    toast('Отчёт удалён');
    await refreshReports();
  } catch (err){
    console.error('Ошибка удаления:', err);
    toast('Не удалось удалить: ' + (err.message || 'нет прав'), 'error');
  }
}
