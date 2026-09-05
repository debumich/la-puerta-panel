let _forumTimer = null;
let _booted = false;

function switchTab(tab){
  if (!canAccessTab(tab)){
    if (!isSignedIn()) toast('Войдите, чтобы открыть этот раздел', 'error');
    else toast('У вас нет доступа к этому разделу', 'error');
    tab = isSignedIn() ? 'dashboard' : 'leaders';
  }
  state.tab = tab;
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab));
  document.querySelectorAll('#sidebar .nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  setPageTitle(tab);
  toggleSidebar(false);
  window.scrollTo({ top: 0 });
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'leaders') renderLeaders();
  if (tab === 'archive') loadArchive();
  if (tab === 'reports'){ initReportForm(); if (canViewReports()) loadReports(); }
  if (tab === 'users') loadUsers();
  if (tab === 'factions') renderFactionsSection();
}

async function onSessionChanged(full){
  renderSidebar();
  renderTopbar();
  if (!_booted) return;
  await loadLeaderUsers();
  if (!state.tab || !canAccessTab(state.tab) || full) switchTab(isSignedIn() ? 'dashboard' : 'leaders');
  else switchTab(state.tab);
}

function handleAction(el){
  const a = el.dataset.action;
  const id = el.dataset.id;
  const map = {
    'login': () => login(),
    'logout': () => logout(),
    'modal-close': () => closeModal(),
    'retry-forum': () => { renderLeadersSkeleton(); fetchForum(true); },
    'retry-archive': () => loadArchive(),
    'retry-reports': () => loadReports(),
    'retry-users': () => loadUsers(),
    'archive-edit': () => openArchiveModal(id),
    'archive-save': () => saveArchive(id),
    'archive-delete': () => deleteArchive(id),
    'archive-restore': () => restoreArchive(id),
    'report-edit': () => openReportEditModal(id),
    'report-edit-save': () => saveReportComment(id),
    'report-delete': () => deleteReport(id),
    'report-restore': () => restoreReport(id),
    'reports-more': () => loadReports(true),
    'user-edit': () => openUserModal(id),
    'user-save': () => saveUser(id),
    'user-revoke': () => revokeAdmin(id),
    'user-rename': () => openRenameModal(id),
    'user-rename-save': () => saveRename(id),
    'faction-create': () => openFactionModal(null),
    'faction-edit': () => openFactionModal(id),
    'faction-save': () => saveFaction(id || null)
  };
  if (map[a]) map[a]();
}

function bindEvents(){
  document.addEventListener('click', e => {
    const tabEl = e.target.closest('[data-tab]');
    if (tabEl){ switchTab(tabEl.dataset.tab); return; }
    const actionEl = e.target.closest('[data-action]');
    if (actionEl){ handleAction(actionEl); return; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape'){ closeConfirm(false); closeModal(); }
  });

  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebar();
    });
  }
  document.getElementById('sidebarBackdrop').addEventListener('click', () => toggleSidebar(false));

  document.getElementById('leaderSearch').addEventListener('input', debounce(e => { state.search = e.target.value; renderLeaders(); }, 150));
  document.getElementById('statsRow').addEventListener('click', e => {
    const chip = e.target.closest('.stat-chip');
    if (!chip || chip.classList.contains('static')) return;
    const st = chip.dataset.status || null;
    state.statusFilter = state.statusFilter === st ? null : st;
    renderLeaders();
  });
  document.getElementById('refreshBtn').addEventListener('click', () => fetchForum(true));

  document.getElementById('archiveSearch').addEventListener('input', debounce(e => { state.archiveSearch = e.target.value; renderArchive(); }, 150));
  document.getElementById('archiveAddBtn').addEventListener('click', () => openArchiveModal(null));
  document.getElementById('archiveShowDeleted').addEventListener('change', e => { state.archiveShowDeleted = e.target.checked; loadArchive(); });

  document.getElementById('reportFaction').addEventListener('change', updateReportLeaderName);
  document.getElementById('saveReportBtn').addEventListener('click', saveReport);
  ['reportFilterFaction', 'reportFilterStart', 'reportFilterEnd'].forEach(id => document.getElementById(id).addEventListener('change', renderReports));
  document.getElementById('reportFilterReset').addEventListener('click', () => {
    ['reportFilterFaction', 'reportFilterStart', 'reportFilterEnd'].forEach(id => document.getElementById(id).value = '');
    renderReports();
  });
  document.getElementById('reportsShowDeleted').addEventListener('change', e => { state.reportsShowDeleted = e.target.checked; renderReports(); });

  document.getElementById('confirmOk').addEventListener('click', () => closeConfirm(true));
  document.getElementById('confirmCancel').addEventListener('click', () => closeConfirm(false));
  document.getElementById('confirmOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeConfirm(false); });
  document.getElementById('confirmReason').addEventListener('keydown', e => { if (e.key === 'Enter') closeConfirm(true); });
  document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

  window.addEventListener('offline', () => toast('Нет соединения с интернетом. Данные могут быть неактуальны.', 'error'));
  window.addEventListener('online', () => { toast('Соединение восстановлено'); fetchForum(false); });
}

async function boot(){
  bindEvents();
  renderSidebar();
  renderTopbar();
  renderLeadersSkeleton();
  loadCachedForum();
  await loadFactions();
  _booted = true;
  await new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(() => { unsub(); resolve(); });
  });
  if (auth.currentUser){
    await new Promise(resolve => {
      const started = Date.now();
      const check = () => { if (state.user || !state.authUser || Date.now() - started > 8000) resolve(); else setTimeout(check, 50); };
      check();
    });
  }
  await loadLeaderUsers();
  if (state.forum) renderLeaders();
  switchTab(isSignedIn() ? 'dashboard' : 'leaders');
  fetchForum(false);
  _forumTimer = setInterval(() => fetchForum(false), AUTO_REFRESH_MIN * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  boot();
});