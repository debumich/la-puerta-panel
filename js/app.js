/* ============================================================
   Точка входа: навигация, привязка событий, запуск.
   Все обработчики — через делегирование и addEventListener,
   никаких inline onclick (безопаснее и чище).
   ============================================================ */

const ADMIN_TABS = ['manager', 'settings'];

function switchTab(tab){
  if (!currentUser) return;
  if (ADMIN_TABS.includes(tab) && currentUser.role !== 'admin'){
    toast('Этот раздел доступен только администратору', 'error');
    return;
  }

  document.querySelectorAll('.panel').forEach(p =>
    p.classList.toggle('active', p.id === 'panel-' + tab));
  document.querySelectorAll('#header-root .tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));

  // ленивые загрузки при открытии вкладок
  if (tab === 'reports'){ initReportForm(); renderReports(); }
  if (tab === 'manager'){ fillManagerFactionSelect(); loadLeadersList(); }
  if (tab === 'settings'){ renderFactionToggles(); renderMyFactionsChips(); }
}

function bindEvents(){
  /* ---- вход ---- */
  document.getElementById('googleLoginBtn').addEventListener('click', login);

  /* ---- хедер: вкладки ---- */
  document.getElementById('header-root').addEventListener('click', e => {
    const el = e.target.closest('[data-tab]');
    if (el) switchTab(el.dataset.tab);
  });

  /* ---- лидеры: поиск, фильтры, обновление ---- */
  document.getElementById('leaderSearch').addEventListener('input', debounce(e => {
    ui.search = e.target.value;
    renderLeaders();
  }, 150));

  document.getElementById('statsRow').addEventListener('click', e => {
    const chip = e.target.closest('.stat-chip');
    if (!chip) return;
    const status = chip.dataset.status || null;
    ui.statusFilter = (ui.statusFilter === status) ? null : status;
    renderLeaders();
  });

  document.getElementById('refreshBtn').addEventListener('click', () => fetchLeaders(true));

  document.getElementById('leadersRoot').addEventListener('click', e => {
    if (e.target.closest('[data-action="retry-leaders"]')){
      renderLeadersSkeleton();
      fetchLeaders(true);
    }
  });

  /* ---- отчёты ---- */
  document.getElementById('reportSideSeg').addEventListener('click', e => {
    const btn = e.target.closest('[data-side]');
    if (btn) setReportSide(btn.dataset.side);
  });

  document.getElementById('reportFaction').addEventListener('change', updateLeaderName);
  document.getElementById('saveReportBtn').addEventListener('click', saveReport);

  document.getElementById('reportFilterStart').addEventListener('change', renderReports);
  document.getElementById('reportFilterEnd').addEventListener('change', renderReports);
  document.getElementById('reportFilterReset').addEventListener('click', () => {
    document.getElementById('reportFilterStart').value = '';
    document.getElementById('reportFilterEnd').value = '';
    renderReports();
  });

  document.getElementById('reportsList').addEventListener('click', e => {
    const btn = e.target.closest('.r-delete');
    if (btn) deleteReport(btn.dataset.id);
  });

  /* ---- управление лидерами ---- */
  document.getElementById('addLeaderBtn').addEventListener('click', addLeader);
  document.getElementById('newLeaderEmail').addEventListener('keydown', e => {
    if (e.key === 'Enter') addLeader();
  });
  document.getElementById('managerSearch').addEventListener('input', debounce(e => {
    ui.managerSearch = e.target.value;
    loadLeadersList();
  }, 150));
  document.getElementById('leadersListRoot').addEventListener('click', e => {
    const btn = e.target.closest('[data-remove-leader]');
    if (btn) removeLeader(btn.dataset.removeLeader);
  });

  /* ---- настройки ---- */
  document.getElementById('selectAllBtn').addEventListener('click', selectAllFactions);
  document.getElementById('deselectAllBtn').addEventListener('click', deselectAllFactions);

  const settingsRoot = document.getElementById('settingsCategories');
  const handleToggle = el => {
    if (el.dataset.gov) toggleGov();
    else if (el.dataset.key) toggleFactionSingle(el.dataset.key);
  };
  settingsRoot.addEventListener('click', e => {
    const el = e.target.closest('.faction-toggle-item');
    if (el) handleToggle(el);
  });
  settingsRoot.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target.closest('.faction-toggle-item');
    if (el){ e.preventDefault(); handleToggle(el); }
  });

  document.getElementById('myFactionsChips').addEventListener('click', e => {
    const el = e.target.closest('.remove');
    if (!el) return;
    if (el.dataset.removeGov) removeGov();
    else if (el.dataset.removeKey) toggleFactionSingle(el.dataset.removeKey);
  });

  /* ---- модалка подтверждения ---- */
  document.getElementById('confirmOk').addEventListener('click', () => closeConfirm(true));
  document.getElementById('confirmCancel').addEventListener('click', () => closeConfirm(false));
  document.getElementById('confirmOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeConfirm(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeConfirm(false);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  initAuth();
});
