/* ============================================================
   Управление лидерами (только админ): привязка email → фракция.
   Документы лежат в коллекции users, id документа = email.
   ============================================================ */

let managerCache = null;

async function loadLeadersList(force = false){
  if (!currentUser || currentUser.role !== 'admin') return;
  const container = document.getElementById('leadersListRoot');

  if (!managerCache || force){
    try {
      const snap = await db.collection('users').get();
      managerCache = snap.docs
        .map(d => ({ email: d.id, faction: d.data().faction || '—' }))
        .sort((a, b) => a.faction.localeCompare(b.faction) || a.email.localeCompare(b.email));
    } catch (err){
      console.error('Ошибка загрузки списка лидеров:', err);
      container.innerHTML = '<div class="empty-state">Не удалось загрузить список. Проверьте правила Firestore.</div>';
      return;
    }
  }

  const q = ui.managerSearch.trim().toLowerCase();
  const rows = q
    ? managerCache.filter(l => l.email.toLowerCase().includes(q) || l.faction.toLowerCase().includes(q))
    : managerCache;

  document.getElementById('leadersCount').textContent = managerCache.length;

  if (!rows.length){
    container.innerHTML = `<div class="empty-state">${
      managerCache.length ? 'Ничего не найдено.' : 'Пока никто не привязан. Добавьте первого лидера выше.'
    }</div>`;
    return;
  }

  container.innerHTML = `
    <table class="leader-table">
      <thead><tr><th>Email</th><th>Фракция</th><th></th></tr></thead>
      <tbody>
        ${rows.map(l => `
          <tr>
            <td>${escapeHtml(l.email)}</td>
            <td>${escapeHtml(l.faction)}</td>
            <td style="text-align:right;"><button class="remove-btn" data-remove-leader="${escapeHtml(l.email)}">Удалить</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function addLeader(){
  const emailInput = document.getElementById('newLeaderEmail');
  const email = emailInput.value.trim().toLowerCase();
  const faction = document.getElementById('newLeaderFaction').value;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    toast('Введите корректный email', 'error');
    return;
  }
  if (!faction){
    toast('Выберите фракцию', 'error');
    return;
  }

  const existing = managerCache?.find(l => l.email === email);
  if (existing && existing.faction !== faction){
    const ok = await confirmDialog({
      title: 'Перепривязать лидера?',
      text: `${email} уже привязан к «${existing.faction}». Заменить на «${faction}»?`,
      okText: 'Заменить'
    });
    if (!ok) return;
  }

  try {
    await db.collection('users').doc(email).set({ faction });
    toast(`Лидер ${email} привязан к «${faction}»`);
    emailInput.value = '';
    await loadLeadersList(true);
  } catch (err){
    console.error('Ошибка добавления:', err);
    toast('Не удалось добавить: ' + (err.message || 'нет прав'), 'error');
  }
}

async function removeLeader(email){
  const ok = await confirmDialog({
    title: 'Удалить лидера?',
    text: `${email} потеряет доступ к панели.`,
    okText: 'Удалить'
  });
  if (!ok) return;

  try {
    await db.collection('users').doc(email).delete();
    toast(`Доступ для ${email} отозван`);
    await loadLeadersList(true);
  } catch (err){
    console.error('Ошибка удаления:', err);
    toast('Не удалось удалить: ' + (err.message || 'нет прав'), 'error');
  }
}

/* Select фракций, сгруппированный по категориям */
function fillManagerFactionSelect(){
  const sel = document.getElementById('newLeaderFaction');
  if (!leaderData){
    sel.innerHTML = '<option value="">Данные загружаются…</option>';
    return;
  }
  const prev = sel.value;
  const groups = {};
  Object.keys(leaderData).forEach(key => {
    const cat = leaderData[key].category || 'other';
    (groups[cat] ??= []).push(key);
  });
  sel.innerHTML = CATEGORY_ORDER
    .filter(cat => groups[cat]?.length)
    .map(cat => `<optgroup label="${CATEGORY_NAMES[cat]}">${
      groups[cat].sort((a, b) => a.localeCompare(b))
        .map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('')
    }</optgroup>`).join('');
  if (prev && leaderData[prev]) sel.value = prev;
}
