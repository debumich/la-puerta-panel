const NAV_ITEMS = [
  { id: 'dashboard', label: 'Главная', icon: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>' },
  { id: 'leaders', label: 'Лидеры', icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/>' },
  { id: 'archive', label: 'Архив', icon: '<path d="M3 7h18v13H3z"/><path d="M5 4h14v3H5z"/><path d="M10 12h4"/>' },
  { id: 'reports', label: 'Отчёты', icon: '<path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6"/><path d="M9 13h7M9 17h7"/>' },
  { id: 'users', label: 'Пользователи', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' },
  { id: 'factions', label: 'Фракции', icon: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>' }
];

function navIcon(path){
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function renderSidebar(){
  const el = document.getElementById('sidebar');
  const items = NAV_ITEMS.filter(i => canAccessTab(i.id));
  const u = state.user;
  const levelInfo = u && u.systemRole !== 'user' ? `<div class="me-level"><span class="level-dot" style="background:${levelColor(u.serverLevel)}"></span>${escapeHtml(levelLabel(u.serverLevel))}</div>` : '';
  el.innerHTML = `
    <div class="brand">
      <div class="brand-text">GTA5RP <span>HUB</span></div>
    </div>
    <nav class="nav">
      ${items.map(i => `<button class="nav-item${state.tab === i.id ? ' active' : ''}" data-tab="${i.id}">${navIcon(i.icon)}<span>${i.label}</span></button>`).join('')}
    </nav>
    <div class="sidebar-foot">
      ${u ? `
        <div class="me-card" style="cursor:default">
          <div class="avatar avatar-sm">${escapeHtml(initialsOf(u.displayName || u.email))}</div>
          <div class="me-meta">
            <div class="me-name">${escapeHtml(u.displayName || u.email)}</div>
            <div class="me-role">${escapeHtml(roleLabel(u))}</div>
            ${levelInfo}
          </div>
        </div>
        <button class="btn btn-ghost btn-block" data-action="logout">Выйти</button>`
      : `<button class="btn btn-primary btn-block" data-action="login">Войти через Google</button>
         <div class="guest-note">Гость видит лидеров и архив</div>`}
    </div>`;
}

function levelColor(n){
  const colors = {
    1: '#5d6489',
    2: '#4f8cff',
    3: '#f0b429',
    4: '#e8c84a',
    5: '#3ddc84',
    6: '#8b5cff'
  };
  return colors[n] || '#5d6489';
}

function renderTopbar(){
  const right = document.getElementById('topbarRight');
  const u = state.user;
  if (!u){
    right.innerHTML = `<button class="btn btn-primary" data-action="login">Войти</button>`;
    return;
  }
  const tags = [];
  tags.push(`<span class="role-badge${u.systemRole === 'site_admin' ? ' role-admin' : ''}${u.systemRole === 'server_admin' ? ' role-server_admin' : ''}">${escapeHtml(roleLabel(u))}</span>`);
  if (isLeader()) tags.push(`<span class="faction-badge">${escapeHtml(factionName(u.faction))}</span>`);
  if (isStaff() && curatedFactions().length) tags.push(`<span class="faction-badge">${escapeHtml(curatedFactions().map(factionName).join(', '))}</span>`);
  right.innerHTML = tags.join('');
}

function setPageTitle(tab){
  document.getElementById('pageTitle').textContent = TAB_TITLES[tab] || 'GTA5RP HUB';
}

function toggleSidebar(force){
  const open = typeof force === 'boolean' ? force : !document.body.classList.contains('sidebar-open');
  document.body.classList.toggle('sidebar-open', open);
}