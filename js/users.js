let _users = [];
let _presence = {};

async function loadUsers(){
  const root = document.getElementById('usersRoot');
  if (!isSiteAdmin() && !isStaff()){ root.innerHTML = lockedState('Раздел доступен администрации.'); return; }
  if (!document.getElementById('usersList')) root.innerHTML = skeletonRows(6);
  else document.getElementById('usersList').innerHTML = skeletonRows(6);
  try {
    let snap;
    if (isSiteAdmin()){
      snap = await db.collection('users').get();
    } else if (curatedFactions().length){
      snap = await db.collection('users').where('faction', 'in', curatedFactions().slice(0, 30)).get();
    } else {
      _users = [];
      renderUsers();
      return;
    }
    _users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    _users.sort((a, b) => roleWeight(b.systemRole) - roleWeight(a.systemRole) || String(a.displayName || a.email).localeCompare(String(b.displayName || b.email), 'ru'));
    _presence = await loadPresenceMap(_users.map(u => u.uid));
    renderUsers();
  } catch (err){
    console.error('Пользователи', err);
    root.innerHTML = errorState('Не удалось загрузить пользователей. ' + humanError(err), 'retry-users');
  }
}

function roleWeight(r){
  return ['user', 'leader', 'curator_assistant', 'curator', 'server_admin', 'site_admin'].indexOf(r);
}

function renderUsers(){
  const root = document.getElementById('usersRoot');
  if (!document.getElementById('usersList')){
    root.innerHTML = `
      <div class="toolbar">
        <div class="stats-row" id="usersStats"></div>
        <label class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" id="usersSearch" placeholder="Ник, email, роль или фракция" value="${escapeHtml(state.usersSearch)}" autocomplete="off">
        </label>
      </div>
      <div id="usersList"></div>`;
    document.getElementById('usersSearch').addEventListener('input', debounce(e => { state.usersSearch = e.target.value; renderUsers(); }, 150));
  }
  const q = state.usersSearch.trim().toLowerCase();
  const rows = q ? _users.filter(u =>
    (u.displayName || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (ROLES[u.systemRole] || '').toLowerCase().includes(q) ||
    factionName(u.faction).toLowerCase().includes(q)) : _users;
  const admins = _users.filter(u => STAFF_ROLES.includes(u.systemRole) || u.systemRole === 'site_admin').length;
  const online = _users.filter(u => isOnline(_presence[u.uid])).length;
  document.getElementById('usersStats').innerHTML = `
    <span class="stat-chip static"><b>${_users.length}</b>${isSiteAdmin() ? 'пользователей' : 'лидеров'}</span>
    ${isSiteAdmin() ? `<span class="stat-chip static"><b>${admins}</b>администрации</span>` : ''}
    <span class="stat-chip static" data-tone="green"><b>${online}</b>в сети</span>`;
  document.getElementById('usersList').innerHTML = !rows.length ? emptyState(_users.length ? 'Ничего не найдено.' : (isSiteAdmin() ? 'Пока никто не входил в систему.' : 'В ваших фракциях пока нет лидеров с аккаунтом.')) : `
    <div class="card table-card">
      <table class="data-table users-table">
        <thead><tr><th>Пользователь</th><th>Роль</th><th>Уровень</th><th>Фракции</th><th>Статус</th><th>В системе с</th><th></th></tr></thead>
        <tbody>${rows.map(u => {
          const isRegular = u.systemRole === 'user';
          return `<tr class="${u.active === false ? 'row-muted' : ''}">
            <td><div class="user-cell"><div class="avatar avatar-sm">${escapeHtml(initialsOf(u.displayName || u.email))}</div><div><div class="uc-name">${escapeHtml(u.displayName || '—')}</div><div class="uc-email mono">${escapeHtml(u.email)}</div></div></td>
            <td><span class="role-badge${u.systemRole === 'site_admin' ? ' role-admin' : ''}${u.systemRole === 'server_admin' ? ' role-server_admin' : ''}">${escapeHtml(roleLabel(u))}</span></td>
            <td>${isRegular ? '—' : `<span class="${levelClass(u.serverLevel)}">${escapeHtml(levelLabel(u.serverLevel))}</span>`}</td>
            <td>${userFactionsText(u)}</td>
            <td>${u.active === false ? '<span class="badge badge-grey">Отключён</span>' : presenceBadge(_presence[u.uid])}</td>
            <td class="mono">${fmtDate(u.createdAt)}</td>
            <td class="td-actions">${userActionsHtml(u)}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>`;
}

function userFactionsText(u){
  if (u.systemRole === 'leader') return escapeHtml(factionName(u.faction));
  if (Array.isArray(u.curatedFactions) && u.curatedFactions.length) return escapeHtml(u.curatedFactions.map(factionName).join(', '));
  return '<span class="hint">—</span>';
}

function userActionsHtml(u){
  if (isSiteAdmin()) return `<button class="btn btn-ghost btn-sm" data-action="user-edit" data-id="${escapeHtml(u.uid)}">Изменить</button>`;
  if (isStaff() && can('editLeaderNickname') && u.systemRole === 'leader' && curates(u.faction)) return `<button class="btn btn-ghost btn-sm" data-action="user-rename" data-id="${escapeHtml(u.uid)}">Изменить ник</button>`;
  return '';
}

function openUserModal(uid){
  const u = _users.find(x => x.uid === uid);
  if (!u) return;
  const self = uid === state.user.uid;
  const curated = Array.isArray(u.curatedFactions) ? u.curatedFactions : [];
  const perms = Array.isArray(u.permissions) ? u.permissions : [];
  openModal(`
    <h2>${escapeHtml(u.displayName || u.email)}</h2>
    <p class="sub mono">${escapeHtml(u.email)}${self ? ' · это ваш аккаунт: роль и права себе изменить нельзя' : ''}</p>
    <div class="grid-2">
      <div class="field"><label for="uName">Никнейм</label><input type="text" id="uName" maxlength="80" value="${escapeHtml(u.displayName || '')}" placeholder="Имя Фамилия"></div>
      <div class="field"><label for="uLevel">Серверный уровень</label><select id="uLevel" ${self ? 'disabled' : ''}>${Object.keys(LEVELS).map(n => `<option value="${n}"${Number(u.serverLevel) === Number(n) ? ' selected' : ''}>${LEVELS[n]}</option>`).join('')}</select></div>
    </div>
    <div class="grid-2">
      <div class="field"><label for="uRole">Системная роль</label><select id="uRole" ${self ? 'disabled' : ''}>${Object.keys(ROLES).map(r => `<option value="${r}"${u.systemRole === r ? ' selected' : ''}>${ROLES[r]}</option>`).join('')}</select></div>
      <div class="field" id="uFactionWrap"><label for="uFaction">Фракция лидера</label><select id="uFaction" ${self ? 'disabled' : ''}>${factionGroupedOptionsHtml(u.faction || '', 'Не назначена')}</select></div>
    </div>
    <div class="field" id="uCuratedWrap"><label>Курируемые фракции</label>
      <div class="check-grid">${state.factions.filter(f => f.active !== false).sort(sortByName).map(f => `<label class="check-inline"><input type="checkbox" name="uCurated" value="${escapeHtml(f.id)}" ${curated.includes(f.id) ? 'checked' : ''} ${self ? 'disabled' : ''}> ${escapeHtml(f.name)}</label>`).join('')}</div>
    </div>
    <div class="field" id="uPermsWrap"><label>Права</label>
      <div class="check-grid">${Object.keys(PERMISSIONS).map(p => `<label class="check-inline"><input type="checkbox" name="uPerm" value="${p}" ${perms.includes(p) ? 'checked' : ''} ${self ? 'disabled' : ''}> ${PERMISSIONS[p]}</label>`).join('')}</div>
    </div>
    <div class="field" id="uEditWrap"><label class="check-inline"><input type="checkbox" id="uReportEdit" ${u.reportEditingEnabled ? 'checked' : ''} ${self ? 'disabled' : ''}> Лидер может редактировать комментарий своих отчётов</label></div>
    <div class="field"><label class="check-inline"><input type="checkbox" id="uActive" ${u.active !== false ? 'checked' : ''} ${self ? 'disabled' : ''}> Аккаунт активен</label></div>
    <div class="modal-actions">
      ${!self && (STAFF_ROLES.includes(u.systemRole) || u.systemRole === 'site_admin') ? `<button class="btn btn-ghost danger-text" data-action="user-revoke" data-id="${escapeHtml(uid)}">Снять с администрации</button>` : ''}
      <span class="spacer"></span>
      <button class="btn btn-ghost" data-action="modal-close">Отмена</button>
      <button class="btn btn-primary" id="uSaveBtn" data-action="user-save" data-id="${escapeHtml(uid)}"><span class="spinner"></span><span>Сохранить</span></button>
    </div>`);
  const roleSel = document.getElementById('uRole');
  const sync = () => {
    const r = roleSel.value;
    document.getElementById('uFactionWrap').hidden = r !== 'leader';
    document.getElementById('uEditWrap').hidden = r !== 'leader';
    document.getElementById('uCuratedWrap').hidden = !STAFF_ROLES.includes(r);
    document.getElementById('uPermsWrap').hidden = !STAFF_ROLES.includes(r);
  };
  roleSel.addEventListener('change', sync);
  sync();
}

async function saveUser(uid){
  const u = _users.find(x => x.uid === uid);
  if (!u) return;
  const btn = document.getElementById('uSaveBtn');
  const self = uid === state.user.uid;
  const displayName = document.getElementById('uName').value.trim();
  if (!displayName){ toast('Введите никнейм', 'error'); return; }
  const patch = { displayName, updatedAt: FieldValue.serverTimestamp() };
  if (!self){
    const systemRole = document.getElementById('uRole').value;
    const serverLevel = Number(document.getElementById('uLevel').value);
    const isLeaderRole = systemRole === 'leader';
    const isStaffRole = STAFF_ROLES.includes(systemRole);
    const faction = isLeaderRole ? document.getElementById('uFaction').value : null;
    if (isLeaderRole && !faction){ toast('Выберите фракцию для лидера', 'error'); return; }
    Object.assign(patch, {
      systemRole,
      serverLevel,
      faction: faction || null,
      curatedFactions: isStaffRole ? [...document.querySelectorAll('input[name="uCurated"]:checked')].map(i => i.value) : [],
      permissions: isStaffRole ? [...document.querySelectorAll('input[name="uPerm"]:checked')].map(i => i.value) : [],
      reportEditingEnabled: isLeaderRole ? document.getElementById('uReportEdit').checked : false,
      active: document.getElementById('uActive').checked
    });
  }
  setLoading(btn, true);
  try {
    const batch = db.batch();
    addVersion(batch, 'user', uid, stripSystem(u));
    batch.update(db.collection('users').doc(uid), patch);
    const oldValue = pickUserFields(u);
    const newValue = pickUserFields({ ...u, ...patch });
    addAudit(batch, { action: describeUserChange(oldValue, newValue), objectType: 'user', objectId: uid, oldValue, newValue, additionalInfo: u.email, faction: newValue.faction || null });
    await batch.commit();
    closeModal();
    toast('Пользователь обновлён');
    loadUsers();
  } catch (err){
    failToast(err, 'Не удалось сохранить пользователя');
  } finally {
    setLoading(btn, false);
  }
}

function pickUserFields(u){
  return {
    displayName: u.displayName || '',
    systemRole: u.systemRole,
    serverLevel: u.serverLevel,
    faction: u.faction || null,
    curatedFactions: Array.isArray(u.curatedFactions) ? u.curatedFactions : [],
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
    reportEditingEnabled: !!u.reportEditingEnabled,
    active: u.active !== false
  };
}

function describeUserChange(o, n){
  const parts = [];
  if (o.displayName !== n.displayName) parts.push('изменил никнейм');
  if (o.systemRole !== n.systemRole) parts.push(`изменил роль на «${ROLES[n.systemRole]}»`);
  if (o.serverLevel !== n.serverLevel) parts.push(`изменил уровень на «${LEVELS[n.serverLevel] || n.serverLevel}»`);
  if (o.faction !== n.faction) parts.push('изменил фракцию лидера');
  if (JSON.stringify(o.curatedFactions) !== JSON.stringify(n.curatedFactions)) parts.push('изменил курируемые фракции');
  if (JSON.stringify(o.permissions) !== JSON.stringify(n.permissions)) parts.push('изменил права');
  if (o.reportEditingEnabled !== n.reportEditingEnabled) parts.push(n.reportEditingEnabled ? 'разрешил редактирование отчётов' : 'запретил редактирование отчётов');
  if (o.active !== n.active) parts.push(n.active ? 'включил аккаунт' : 'отключил аккаунт');
  if (!parts.length) return 'Сохранил пользователя без изменений';
  return parts.join(', ').replace(/^./, c => c.toUpperCase());
}

async function revokeAdmin(uid){
  const u = _users.find(x => x.uid === uid);
  if (!u) return;
  const res = await confirmDialog({ title: 'Снять с администрации?', text: `${u.displayName || u.email} станет обычным пользователем. Права и курируемые фракции будут отозваны, вся история действий сохранится.`, okText: 'Снять', reason: true });
  if (!res) return;
  try {
    const batch = db.batch();
    addVersion(batch, 'user', uid, stripSystem(u));
    batch.update(db.collection('users').doc(uid), {
      systemRole: 'user', curatedFactions: [], permissions: [], faction: null, reportEditingEnabled: false, updatedAt: FieldValue.serverTimestamp()
    });
    addAudit(batch, { action: 'Снял пользователя с административной должности', objectType: 'user', objectId: uid, oldValue: pickUserFields(u), newValue: { systemRole: 'user', curatedFactions: [], permissions: [] }, additionalInfo: `${u.email}. Причина: ${res.reason}` });
    await batch.commit();
    closeModal();
    toast('Пользователь снят с администрации');
    loadUsers();
  } catch (err){
    failToast(err, 'Не удалось снять пользователя');
  }
}

function openRenameModal(uid){
  const u = _users.find(x => x.uid === uid);
  if (!u) return;
  openModal(`
    <h2>Изменить никнейм лидера</h2>
    <p class="sub">${escapeHtml(factionName(u.faction))} · ${escapeHtml(u.email)}</p>
    <div class="field"><label for="rnName">Новый никнейм</label><input type="text" id="rnName" maxlength="80" value="${escapeHtml(u.displayName || '')}"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-action="modal-close">Отмена</button>
      <button class="btn btn-primary" id="rnSaveBtn" data-action="user-rename-save" data-id="${escapeHtml(uid)}"><span class="spinner"></span><span>Сохранить</span></button>
    </div>`);
}

async function saveRename(uid){
  const u = _users.find(x => x.uid === uid);
  if (!u) return;
  const btn = document.getElementById('rnSaveBtn');
  const displayName = document.getElementById('rnName').value.trim();
  if (!displayName){ toast('Введите никнейм', 'error'); return; }
  setLoading(btn, true);
  try {
    const batch = db.batch();
    addVersion(batch, 'user', uid, stripSystem(u));
    batch.update(db.collection('users').doc(uid), { displayName, updatedAt: FieldValue.serverTimestamp() });
    addAudit(batch, { action: `Изменил никнейм лидера ${factionName(u.faction)}`, objectType: 'user', objectId: uid, oldValue: { displayName: u.displayName || '' }, newValue: { displayName }, faction: u.faction });
    await batch.commit();
    closeModal();
    toast('Никнейм обновлён');
    loadUsers();
  } catch (err){
    failToast(err, 'Не удалось изменить никнейм');
  } finally {
    setLoading(btn, false);
  }
}
