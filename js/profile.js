function renderProfile(){
  const root = document.getElementById('profileRoot');
  if (!isSignedIn()){ root.innerHTML = lockedState('Войдите, чтобы открыть профиль.'); return; }
  const u = state.user;
  const perms = Array.isArray(u.permissions) ? u.permissions.filter(p => PERMISSIONS[p]) : [];
  root.innerHTML = `
    <div class="profile-layout">
      <div class="card profile-card">
        <div class="profile-avatar-wrap">
          ${avatarHtml(u.avatarUrl, u.displayName || u.email, 'avatar-xl')}
          <label class="btn btn-ghost btn-sm file-btn" id="avatarBtn"><span class="spinner"></span><span>Сменить аватар</span><input type="file" id="avatarInput" accept="image/png,image/jpeg,image/webp" hidden></label>
          <div class="hint">PNG, JPG или WebP до 3 МБ</div>
        </div>
        <div class="profile-name">${escapeHtml(u.displayName || '—')}</div>
        <div class="profile-email mono">${escapeHtml(u.email)}</div>
        <div class="profile-tags">
          <span class="role-badge${u.systemRole === 'site_admin' ? ' role-admin' : ''}">${escapeHtml(roleLabel(u))}</span>
          <span class="level-badge">${escapeHtml(levelLabel(u.serverLevel))}</span>
        </div>
        <div class="hint">Никнейм изменяет администратор сайта.</div>
      </div>
      <div class="card">
        <h3>Доступ</h3>
        <div class="kv">
          <div class="kv-row"><span>Системная роль</span><b>${escapeHtml(roleLabel(u))}</b></div>
          <div class="kv-row"><span>Серверный уровень</span><b>${escapeHtml(levelLabel(u.serverLevel))}</b></div>
          ${isLeader() ? `<div class="kv-row"><span>Фракция</span><b>${escapeHtml(factionName(u.faction))}</b></div>` : ''}
          ${isStaff() ? `<div class="kv-row"><span>Курируемые фракции</span><b>${curatedFactions().length ? escapeHtml(curatedFactions().map(factionName).join(', ')) : 'Не назначены'}</b></div>` : ''}
          ${isLeader() ? `<div class="kv-row"><span>Редактирование комментария отчёта</span><b>${u.reportEditingEnabled ? 'Разрешено' : 'Запрещено'}</b></div>` : ''}
          <div class="kv-row"><span>В системе с</span><b>${fmtDate(u.createdAt)}</b></div>
        </div>
        ${isStaff() ? `<h3 class="mt">Права</h3>${perms.length ? `<div class="chip-row">${perms.map(p => `<span class="chip">${escapeHtml(PERMISSIONS[p])}</span>`).join('')}</div>` : '<div class="hint">Права не назначены.</div>'}` : ''}
        ${isSiteAdmin() ? '<h3 class="mt">Права</h3><div class="hint">Администратор сайта имеет полный доступ ко всем разделам.</div>' : ''}
      </div>
    </div>`;
  document.getElementById('avatarInput').addEventListener('change', e => uploadAvatar(e.target.files[0]));
}

async function uploadAvatar(file){
  if (!file || !isSignedIn()) return;
  const btn = document.getElementById('avatarBtn');
  try {
    validateImage(file);
    setLoading(btn, true);
    const ref = storage.ref(`avatars/${state.user.uid}`);
    await ref.put(file, { contentType: file.type });
    const url = await ref.getDownloadURL();
    await db.collection('users').doc(state.user.uid).update({ avatarUrl: url, updatedAt: FieldValue.serverTimestamp() });
    toast('Аватар обновлён');
  } catch (err){
    failToast(err, 'Не удалось загрузить аватар');
  } finally {
    setLoading(btn, false);
  }
}
