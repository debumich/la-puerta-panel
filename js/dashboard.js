async function renderDashboard(){
  const root = document.getElementById('dashboardRoot');
  if (!isSignedIn()){ root.innerHTML = lockedState('Войдите, чтобы открыть главную.'); return; }
  const u = state.user;
  const actions = [];
  actions.push({ tab: 'leaders', title: 'Лидеры', text: 'Актуальные лидеры фракций с форума, сроки и Active Points.' });
  if (canViewReports()) actions.push({ tab: 'reports', title: isLeader() ? 'Мои отчёты' : 'Отчёты', text: isLeader() ? `Отчёты по фракции ${factionName(myFaction())}.` : 'Отчёты по доступным вам фракциям.' });
  actions.push({ tab: 'archive', title: 'Архив лидеров', text: 'История сроков, результаты и причины ухода.' });
  if (isSiteAdmin() || isStaff()) actions.push({ tab: 'users', title: isSiteAdmin() ? 'Пользователи' : 'Лидеры моих фракций', text: isSiteAdmin() ? 'Роли, уровни, курируемые фракции и права.' : 'Аккаунты лидеров курируемых фракций.' });
  if (isSiteAdmin()) actions.push({ tab: 'factions', title: 'Фракции', text: 'Стабильные ID, названия, логотипы и связь с форумом.' });
  actions.push({ tab: 'profile', title: 'Профиль', text: 'Ваши данные, доступ и аватар.' });

  const forumStats = forumSummary();
  root.innerHTML = `
    <div class="hero card">
      <div class="hero-text">
        <div class="hero-kicker">GTA5RP HUB</div>
        <h2>Здравствуйте, ${escapeHtml(u.displayName || u.email)}</h2>
        <p>Внутренняя платформа для работы с лидерами фракций: сроки, отчёты, архив и административное управление. Вы вошли как <b>${escapeHtml(roleLabel(u))}</b>${isLeader() ? ` фракции <b>${escapeHtml(factionName(myFaction()))}</b>` : ''}${isStaff() && curatedFactions().length ? `, курируете <b>${escapeHtml(curatedFactions().map(factionName).join(', '))}</b>` : ''}.</p>
        ${isStaff() && !curatedFactions().length ? '<p class="hint">Курируемые фракции вам пока не назначены — обратитесь к администратору сайта.</p>' : ''}
      </div>
      ${forumStats ? `<div class="hero-stats">
        <div class="hs"><b>${forumStats.total}</b><span>фракций</span></div>
        <div class="hs" data-tone="amber"><b>${forumStats.soon}</b><span>истекает</span></div>
        <div class="hs" data-tone="red"><b>${forumStats.expired}</b><span>просрочено</span></div>
        <div class="hs" data-tone="grey"><b>${forumStats.vacant}</b><span>не назначено</span></div>
      </div>` : ''}
    </div>
    ${isSiteAdmin() ? `<div class="stats-grid" id="adminStats">${['users', 'admins', 'leaders', 'reports', 'archive', 'factions'].map(k => `<div class="stat-card skel-card"></div>`).join('')}</div>` : ''}
    <div class="group-title">Быстрые действия</div>
    <div class="actions-grid">${actions.map(a => `
      <button class="action-card" data-tab="${a.tab}">
        <div class="ac-title">${escapeHtml(a.title)}</div>
        <div class="ac-text">${escapeHtml(a.text)}</div>
      </button>`).join('')}</div>`;
  if (isSiteAdmin()) loadAdminStats();
}

function forumSummary(){
  if (!state.forum) return null;
  const s = { total: 0, soon: 0, expired: 0, vacant: 0 };
  Object.values(state.forum).forEach(e => {
    s.total++;
    if (!e.nickname || e.nickname.trim() === '-'){ s.vacant++; return; }
    const st = daysLeftInfo(e.appointedDate, e.term).status;
    if (st === 'expired') s.expired++;
    else if (st === 'red' || st === 'yellow') s.soon++;
  });
  return s;
}

async function countOf(query){
  try {
    const snap = await query.get();
    return snap.size;
  } catch (err){
    console.error('Счётчик', err);
    return null;
  }
}

async function loadAdminStats(){
  const el = document.getElementById('adminStats');
  if (!el) return;
  const [users, admins, leaders, reports, archive] = await Promise.all([
    countOf(db.collection('users')),
    countOf(db.collection('users').where('systemRole', 'in', [...STAFF_ROLES, 'site_admin'])),
    countOf(db.collection('users').where('systemRole', '==', 'leader')),
    countOf(db.collection('reports').where('deleted', '==', false)),
    countOf(db.collection('leaderHistory').where('deleted', '==', false))
  ]);
  const unmapped = unmappedForumKeys().length;
  const cards = [
    { label: 'Пользователи', value: users, tab: 'users' },
    { label: 'Администрация', value: admins, tab: 'users' },
    { label: 'Лидеры с аккаунтом', value: leaders, tab: 'users' },
    { label: 'Отчёты', value: reports, tab: 'reports' },
    { label: 'Записей в архиве', value: archive, tab: 'archive' },
    { label: 'Фракций в базе', value: state.factions.length, tab: 'factions', note: unmapped ? `ещё ${unmapped} на форуме` : '' }
  ];
  if (!document.getElementById('adminStats')) return;
  el.innerHTML = cards.map(c => `
    <button class="stat-card" data-tab="${c.tab}">
      <b>${c.value === null ? '—' : c.value}</b>
      <span>${escapeHtml(c.label)}</span>
      ${c.note ? `<em>${escapeHtml(c.note)}</em>` : ''}
    </button>`).join('');
}