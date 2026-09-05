/* ============================================================
   Хедер. Собирается из JS, поэтому живёт отдельным файлом —
   вкладки зависят от роли пользователя.
   ============================================================ */

function renderHeader(){
  const root = document.getElementById('header-root');
  if (!currentUser){ root.innerHTML = ''; return; }

  const isAdmin = currentUser.role === 'admin';

  const tabs = [
    { id: 'leaders', label: 'Лидеры' },
    { id: 'reports', label: 'Отчёты' }
  ];
  if (isAdmin){
    tabs.push({ id: 'manager',  label: 'Управление' });
    tabs.push({ id: 'settings', label: 'Настройки' });
  }

  const roleLabel = isAdmin ? 'Администратор' : `Лидер — ${currentUser.faction}`;
  const initial = (currentUser.email || '?')[0].toUpperCase();

  root.innerHTML = `
  <header class="header">
    <div class="header-left">
      <a class="logo-link" data-tab="leaders" title="На главную">
        <img src="Header.png" alt="La Puerta" class="header-logo" onerror="this.style.display='none'">
      </a>
      <nav class="header-tabs">
        ${tabs.map(t => `<button class="tab-btn${t.id === 'leaders' ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </nav>
    </div>
    <div class="header-user">
      <div class="user-meta">
        <span class="role-badge${isAdmin ? ' role-admin' : ''}">${escapeHtml(roleLabel)}</span>
        <span class="user-email">${escapeHtml(currentUser.email)}</span>
      </div>
      <div class="avatar" title="${escapeHtml(currentUser.email)}">${escapeHtml(initial)}</div>
      <button class="btn btn-icon" id="logoutBtn" title="Выйти">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
      </button>
    </div>
  </header>`;

  document.getElementById('logoutBtn').addEventListener('click', logout);
}
