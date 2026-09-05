let _leaderUsers = {};

function loadCachedForum(){
  try {
    const raw = localStorage.getItem('forumData');
    if (raw){ state.forum = JSON.parse(raw); state.forumTime = localStorage.getItem('forumDataTime'); }
  } catch (e){ state.forum = null; }
}

async function fetchForum(force){
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('loading');
  try {
    const url = API_URL + (API_URL.includes('?') ? '&' : '?') + (force ? 'refresh=1&' : '') + '_=' + Date.now();
    const res = await fetchWithTimeout(url, { cache: 'no-store' });
    if (!res.ok) throw { code: 'unavailable' };
    let data;
    try { data = await res.json(); } catch (e){ throw { code: 'invalid-json' }; }
    if (!data || typeof data.leaders !== 'object' || data.leaders === null) throw { code: 'empty' };
    state.forum = data.leaders;
    state.forumTime = data.lastUpdate || new Date().toISOString();
    localStorage.setItem('forumData', JSON.stringify(state.forum));
    localStorage.setItem('forumDataTime', state.forumTime);
    if (data.stale) toast('Форум не отвечает, показаны последние сохранённые данные');
    else if (force) toast('Данные обновлены');
    await afterForumLoaded();
  } catch (err){
    console.error('Данные форума', err);
    if (state.forum){
      toast('Не удалось получить свежие данные, показаны сохранённые', 'error');
      await afterForumLoaded();
    } else {
      document.getElementById('statsRow').innerHTML = '';
      document.getElementById('leadersRoot').innerHTML = errorState('Не удалось загрузить данные с форума. Проверьте интернет и попробуйте ещё раз.', 'retry-forum');
    }
  } finally {
    btn.classList.remove('loading');
    updateForumNote();
  }
}
ERROR_MESSAGES['invalid-json'] = 'Сервер вернул некорректные данные.';
ERROR_MESSAGES['empty'] = 'Сервер не вернул данные о лидерах.';

async function afterForumLoaded(){
  await loadLeaderUsers();
  renderLeaders();
  if (state.tab === 'reports') initReportForm();
  if (state.tab === 'factions') renderFactionsSection();
  if (state.tab === 'dashboard') renderDashboard();
}

async function loadLeaderUsers(){
  _leaderUsers = {};
  if (!isSignedIn()) return;
  try {
    let q = db.collection('users').where('systemRole', '==', 'leader').where('active', '==', true);
    if (isSiteAdmin()){
      const snap = await q.get();
      snap.forEach(d => { const u = d.data(); if (u.faction) _leaderUsers[u.faction] = { uid: d.id, ...u }; });
    } else if (isStaff() && curatedFactions().length){
      const snap = await q.where('faction', 'in', curatedFactions().slice(0, 30)).get();
      snap.forEach(d => { const u = d.data(); if (u.faction) _leaderUsers[u.faction] = { uid: d.id, ...u }; });
    } else if (isLeader()){
      _leaderUsers[myFaction()] = state.user;
    }
  } catch (err){
    console.error('Аккаунты лидеров', err);
  }
}

function updateForumNote(){
  const el = document.getElementById('updateNote');
  if (!state.forumTime){ el.textContent = ''; return; }
  const d = toDate(state.forumTime);
  el.textContent = d ? 'данные форума обновлены ' + d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}

function renderLeadersSkeleton(){
  document.getElementById('statsRow').innerHTML = Array.from({ length: 5 }, () => '<div class="skel-card skel-chip"></div>').join('');
  document.getElementById('leadersRoot').innerHTML = skeletonCards(8);
}

function renderLeaders(){
  const root = document.getElementById('leadersRoot');
  if (!state.forum) return;

  const scoped = Object.keys(state.forum).map(key => {
    const entry = state.forum[key];
    const faction = factionByForumKey(key);
    const category = faction?.category || entry.category || 'other';
    const isVacant = !entry.nickname || entry.nickname.trim() === '-';
    const info = isVacant
      ? { status: 'vacant', badgeClass: 'badge-grey', text: 'Не назначено' }
      : daysLeftInfo(entry.appointedDate, entry.term);
    return { key, entry, faction, category, info };
  });

  renderStats(scoped);

  const q = state.search.trim().toLowerCase();
  let visible = scoped;
  if (q) visible = visible.filter(x =>
    x.key.toLowerCase().includes(q) ||
    (x.faction?.name || '').toLowerCase().includes(q) ||
    (x.entry.nickname || '').toLowerCase().includes(q));
  if (state.statusFilter) visible = visible.filter(x => x.info.status === state.statusFilter);

  if (!visible.length){
    root.innerHTML = emptyState(scoped.length ? 'Ничего не найдено по текущим фильтрам.' : 'На форуме пока нет данных о лидерах.');
    return;
  }

  const groups = {};
  visible.forEach(x => (groups[x.category] ??= []).push(x));
  const cats = Object.keys(groups).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  root.innerHTML = '';
  cats.forEach(cat => {
    const items = groups[cat].sort((a, b) => {
      const d = (STATUS_ORDER[a.info.status] ?? 9) - (STATUS_ORDER[b.info.status] ?? 9);
      return d !== 0 ? d : a.key.localeCompare(b.key, 'ru');
    });
    const g = document.createElement('div');
    g.className = 'group';
    g.innerHTML = `<div class="group-title">${escapeHtml(CATEGORY_NAMES[cat] || cat)}<span class="count">${items.length}</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'card-grid';
    items.forEach(x => grid.appendChild(renderLeaderCard(x)));
    g.appendChild(grid);
    root.appendChild(g);
  });
}

function renderStats(scoped){
  const count = s => scoped.filter(x => x.info.status === s).length;
  const chips = [
    { key: null, label: 'Всего', value: scoped.length, tone: '' },
    { key: 'green', label: 'В норме', value: count('green'), tone: 'green' },
    { key: 'yellow', label: 'Истекает', value: count('yellow'), tone: 'amber' },
    { key: 'red', label: 'Критично', value: count('red'), tone: 'red' },
    { key: 'expired', label: 'Просрочено', value: count('expired'), tone: 'red' },
    { key: 'vacant', label: 'Не назначено', value: count('vacant'), tone: 'grey' }
  ];
  document.getElementById('statsRow').innerHTML = chips.map(c => `
    <button class="stat-chip${(state.statusFilter === c.key || (!state.statusFilter && c.key === null)) ? ' active' : ''}" data-status="${c.key ?? ''}" data-tone="${c.tone}" title="Показать только этот статус"><b>${c.value}</b>${c.label}</button>`).join('');
}

function renderLeaderCard({ key, entry, faction, info }){
  const card = document.createElement('div');
  card.className = 'leader-card';
  card.dataset.status = info.status;
  const isVacant = info.status === 'vacant';
  const name = faction ? faction.name : key;
  const isMine = isLeader() && faction && faction.id === myFaction();
  if (isMine) card.classList.add('mine');
  const leaderUser = faction ? _leaderUsers[faction.id] : null;
  const isJudicial = (faction?.category || entry.category) === 'judicial';

  const meta = [
    `<div class="lc-meta-item"><div class="label">Назначен</div><div class="value">${escapeHtml(entry.appointedDate || '—')}</div></div>`,
    `<div class="lc-meta-item"><div class="label">Срок</div><div class="value">${escapeHtml(entry.term || '—')}</div></div>`
  ];
  if (isJudicial){
    meta.push(`<div class="lc-meta-item"><div class="label">Предупреждения</div><div class="value ${warningsClass(entry.warnings)}">${escapeHtml(entry.warnings ?? '—')}</div></div>`);
  } else {
    const points = parseInt(entry.points, 10);
    meta.push(`<div class="lc-meta-item"><div class="label">Active Points</div><div class="value ${points < 0 ? 'value-negative' : ''}">${escapeHtml(entry.points ?? '—')}</div></div>`);
  }

  card.innerHTML = `
    <div class="lc-top">
      <div class="lc-identity">
        ${faction?.logoUrl ? `<img class="faction-logo" src="${escapeHtml(faction.logoUrl)}" alt="">` : `<div class="faction-logo faction-logo-empty">${escapeHtml(initialsOf(name))}</div>`}
        <div>
          <div class="lc-faction">${escapeHtml(name)}${isMine ? '<span class="mine-tag">вы</span>' : ''}</div>
          <div class="lc-name">${leaderUser ? avatarHtml(leaderUser.avatarUrl, entry.nickname, 'avatar-xs') : ''}${isVacant ? 'Не назначено' : escapeHtml(entry.nickname)}</div>
        </div>
      </div>
      <span class="badge ${info.badgeClass}">${escapeHtml(info.text)}</span>
    </div>
    <div class="lc-meta">${meta.join('')}</div>`;
  return card;
}
