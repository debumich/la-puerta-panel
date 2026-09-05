function renderProfile(){
  const root = document.getElementById('profileRoot');
  if (!isSignedIn()){ root.innerHTML = lockedState('Войдите, чтобы открыть профиль.'); return; }
  const u = state.user;
  const perms = Array.isArray(u.permissions) ? u.permissions.filter(p => PERMISSIONS[p]) : [];
  const isRegularUser = u.systemRole === 'user';
  root.innerHTML = `
    <div class="profile-layout">
      <div class="card profile-card">
        <div class="profile-avatar-wrap">
          ${avatarHtml(u.avatarUrl, u.displayName || u.email, 'avatar-xl')}
        </div>
        <div class="profile-name">${escapeHtml(u.displayName || '—')}</div>
        <div class="profile-email mono">${escapeHtml(u.email)}</div>
        <div class="profile-tags">
          <span class="role-badge${u.systemRole === 'site_admin' ? ' role-admin' : ''}${u.systemRole === 'server_admin' ? ' role-server_admin' : ''}">${escapeHtml(roleLabel(u))}</span>
          ${!isRegularUser ? `<span class="${levelClass(u.serverLevel)}">${escapeHtml(levelLabel(u.serverLevel))}</span>` : ''}
        </div>
      </div>
      <div class="card">
        <h3>Доступ</h3>
        <div class="kv">
          <div class="kv-row"><span>Системная роль</span><b>${escapeHtml(roleLabel(u))}</b></div>
          ${!isRegularUser ? `<div class="kv-row"><span>Серверный уровень</span><b>${escapeHtml(levelLabel(u.serverLevel))}</b></div>` : ''}
          ${isLeader() ? `<div class="kv-row"><span>Фракция</span><b>${escapeHtml(factionName(u.faction))}</b></div>` : ''}
          ${isStaff() ? `<div class="kv-row"><span>Курируемые фракции</span><b>${curatedFactions().length ? escapeHtml(curatedFactions().map(factionName).join(', ')) : 'Не назначены'}</b></div>` : ''}
          ${isLeader() ? `<div class="kv-row"><span>Редактирование комментария отчёта</span><b>${u.reportEditingEnabled ? 'Разрешено' : 'Запрещено'}</b></div>` : ''}
          <div class="kv-row"><span>В системе с</span><b>${fmtDate(u.createdAt)}</b></div>
        </div>
        ${isStaff() ? `<h3 class="mt">Права</h3>${perms.length ? `<div class="chip-row">${perms.map(p => `<span class="chip">${escapeHtml(PERMISSIONS[p])}</span>`).join('')}</div>` : '<div class="hint">Права не назначены.</div>'}` : ''}
        ${isSiteAdmin() ? '<h3 class="mt">Права</h3><div class="hint">Администратор сайта имеет полный доступ ко всем разделам.</div>' : ''}
      </div>
    </div>`;
}