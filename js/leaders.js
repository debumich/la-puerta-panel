/* ============================================================
   Страница «Лидеры»: данные с форума, фильтры, статистика.
   Лидер видит ТОЛЬКО категории своей стороны (гос или крайм).
   ============================================================ */

function factionSide(key){
  const cat = leaderData?.[key]?.category || 'other';
  return SIDE_CATEGORIES.gov.includes(cat) ? 'gov' : 'crime';
}

/* Какие категории доступны текущему пользователю */
function visibleCategories(){
  if (!currentUser) return [];
  if (currentUser.role === 'admin') return CATEGORY_ORDER.slice();
  return SIDE_CATEGORIES[currentUser.side || 'crime'].slice();
}

function loadCachedLeaders(){
  try {
    const raw = localStorage.getItem('leaderData');
    if (raw) leaderData = JSON.parse(raw);
  } catch (e){ /* битый кэш — не страшно */ }
}

async function fetchLeaders(force){
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('loading');
  try {
    const bust = Date.now();
    const url = API_URL + (API_URL.includes('?') ? '&' : '?') + (force ? 'refresh=1&' : '') + '_=' + bust;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || !data.leaders) throw new Error('Пустой ответ API');

    leaderData = data.leaders;
    localStorage.setItem('leaderData', JSON.stringify(leaderData));
    localStorage.setItem('leaderDataTime', data.lastUpdate || new Date().toISOString());

    if (data.stale) toast('Форум не отвечает — показан последний кэш прокси');
    else if (force) toast('Данные обновлены');

    applyLeaderData();
  } catch (err){
    console.error('Ошибка загрузки лидеров:', err);
    if (leaderData){
      toast('Сервер недоступен — показаны сохранённые данные', 'error');
      applyLeaderData();
    } else {
      renderLeadersError();
    }
  } finally {
    btn.classList.remove('loading');
    updateNote();
  }
}

/* Всё, что зависит от свежих данных форума */
function applyLeaderData(){
  if (currentUser && currentUser.role === 'leader'){
    currentUser.side = factionSide(currentUser.faction);
  }
  renderLeaders();
  initReportForm();
  renderReports();
  if (currentUser && currentUser.role === 'admin'){
    renderFactionToggles();
    renderMyFactionsChips();
    fillManagerFactionSelect();
  }
}

function updateNote(){
  const el = document.getElementById('updateNote');
  const t = localStorage.getItem('leaderDataTime');
  if (!t){ el.textContent = ''; return; }
  const d = new Date(t);
  el.textContent = 'обновлено ' + d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

/* ---------- скелетоны и ошибки ---------- */

function renderLeadersSkeleton(){
  document.getElementById('statsRow').innerHTML =
    Array.from({ length: 5 }, () => '<div class="skel-card skel-chip"></div>').join('');
  document.getElementById('leadersRoot').innerHTML =
    '<div class="skel-grid">' +
    Array.from({ length: 8 }, () => '<div class="skel-card"></div>').join('') +
    '</div>';
}

function renderLeadersError(){
  document.getElementById('statsRow').innerHTML = '';
  document.getElementById('leadersRoot').innerHTML = `
    <div class="empty-state">
      Не удалось загрузить данные с форума.<br>
      <button class="btn btn-primary" data-action="retry-leaders">Повторить</button>
    </div>`;
}

/* ---------- рендер ---------- */

function renderLeaders(){
  const root = document.getElementById('leadersRoot');
  if (!leaderData){ return; }

  const cats = visibleCategories();
  const myFactions = currentUser.role === 'admin' ? getMyFactions() : [];

  // 1) базовый скоуп: роль + курируемые фракции (у админа)
  const scoped = [];
  Object.keys(leaderData).forEach(key => {
    const entry = leaderData[key];
    const category = entry.category || 'other';
    if (!cats.includes(category)) return;
    if (myFactions.length && !myFactions.includes(key)) return;

    const isVacant = !entry.nickname || entry.nickname.trim() === '-';
    const info = isVacant
      ? { status: 'vacant', badgeClass: 'badge-grey', text: 'не назначен' }
      : daysLeftInfo(entry.appointedDate, entry.term);

    scoped.push({ key, entry, category, info });
  });

  // 2) статистика считается по скоупу — до поиска и фильтра статусов
  renderStats(scoped);

  // 3) поиск и фильтр по статусу
  const q = ui.search.trim().toLowerCase();
  let visible = scoped;
  if (q){
    visible = visible.filter(({ key, entry }) =>
      key.toLowerCase().includes(q) ||
      (entry.nickname || '').toLowerCase().includes(q));
  }
  if (ui.statusFilter){
    visible = visible.filter(({ info }) => info.status === ui.statusFilter);
  }

  if (visible.length === 0){
    root.innerHTML = `<div class="empty-state">${
      scoped.length === 0
        ? 'В вашей зоне видимости нет ни одной фракции.'
        : 'Ничего не найдено по текущим фильтрам.'
    }</div>`;
    return;
  }

  // 4) группировка по категориям, внутри — по срочности
  const groups = {};
  visible.forEach(item => {
    (groups[item.category] ??= []).push(item);
  });

  const sortedCats = Object.keys(groups).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  root.innerHTML = '';
  sortedCats.forEach(cat => {
    const items = groups[cat];
    items.sort((a, b) => {
      const d = (STATUS_ORDER[a.info.status] ?? 9) - (STATUS_ORDER[b.info.status] ?? 9);
      return d !== 0 ? d : a.key.localeCompare(b.key);
    });

    const groupEl = document.createElement('div');
    groupEl.className = 'group';
    groupEl.innerHTML = `<div class="group-title">${CATEGORY_NAMES[cat] || escapeHtml(cat)}<span class="count">${items.length}</span></div>`;

    const grid = document.createElement('div');
    grid.className = 'card-grid';
    items.forEach(item => grid.appendChild(renderCard(item)));
    groupEl.appendChild(grid);
    root.appendChild(groupEl);
  });
}

function renderStats(scoped){
  const count = s => scoped.filter(x => x.info.status === s).length;
  const chips = [
    { key: null,      label: 'Всего',      value: scoped.length,                 tone: '' },
    { key: 'green',   label: 'В норме',    value: count('green'),                tone: 'green' },
    { key: 'yellow',  label: 'Истекает',   value: count('yellow'),               tone: 'amber' },
    { key: 'red',     label: 'Критично',   value: count('red'),                  tone: 'red' },
    { key: 'expired', label: 'Просрочено', value: count('expired'),              tone: 'red' },
    { key: 'vacant',  label: 'Вакантно',   value: count('vacant'),               tone: 'grey' }
  ];
  document.getElementById('statsRow').innerHTML = chips.map(c => `
    <button class="stat-chip${(ui.statusFilter === c.key || (!ui.statusFilter && c.key === null)) ? ' active' : ''}"
            data-status="${c.key ?? ''}" data-tone="${c.tone}" title="Фильтр по статусу">
      <b>${c.value}</b>${c.label}
    </button>`).join('');
}

function renderCard({ key, entry, info }){
  const card = document.createElement('div');
  card.className = 'leader-card';
  card.dataset.status = info.status;

  const isVacant = info.status === 'vacant';
  const isMine = currentUser.role === 'leader' && currentUser.faction === key;
  if (isMine) card.classList.add('mine');

  const meta = [];
  meta.push(`<div class="lc-meta-item"><div class="label">Назначен</div><div class="value">${escapeHtml(entry.appointedDate || '—')}</div></div>`);
  meta.push(`<div class="lc-meta-item"><div class="label">Срок</div><div class="value">${escapeHtml(entry.term || '—')}</div></div>`);
  if (entry.category === 'judicial'){
    const wcls = warningsClass(entry.warnings);
    meta.push(`<div class="lc-meta-item"><div class="label">Предупр.</div><div class="value ${wcls}">${escapeHtml(entry.warnings ?? '—')}</div></div>`);
  } else {
    const points = parseInt(entry.points, 10);
    const neg = points < 0 ? 'value-negative' : '';
    meta.push(`<div class="lc-meta-item"><div class="label">Баллы</div><div class="value ${neg}">${escapeHtml(entry.points ?? '—')}</div></div>`);
  }

  card.innerHTML = `
    <div class="lc-top">
      <div>
        <div class="lc-faction">${escapeHtml(key)}${isMine ? '<span class="mine-tag">вы</span>' : ''}</div>
        <div class="lc-name">${isVacant ? 'Лидер не назначен' : escapeHtml(entry.nickname)}</div>
      </div>
      <span class="badge ${info.badgeClass}">${escapeHtml(info.text)}</span>
    </div>
    <div class="lc-meta">${meta.join('')}</div>`;
  return card;
}
