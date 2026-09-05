/* ============================================================
   Настройки куратора (только админ): выбор курируемых фракций.
   Пустой список = показывается всё. Хранится в localStorage
   этого браузера.
   ============================================================ */

function getMyFactions(){
  try { return JSON.parse(localStorage.getItem('myFactions') || '[]'); }
  catch (e){ return []; }
}

function setMyFactions(arr){
  localStorage.setItem('myFactions', JSON.stringify(arr));
  renderFactionToggles();
  renderMyFactionsChips();
  renderLeaders();
  renderReports();
}

/* GOV — сводный переключатель: включает/выключает три ключа разом */
function getDisplayFactions(){
  const list = getMyFactions();
  const hasAllGov = GOV_KEYS.every(k => list.includes(k));
  const filtered = list.filter(k => !GOV_KEYS.includes(k));
  if (hasAllGov) filtered.unshift('GOV');
  return filtered;
}

function toggleFactionSingle(key){
  const current = getMyFactions();
  const idx = current.indexOf(key);
  if (idx > -1) current.splice(idx, 1);
  else current.push(key);
  setMyFactions(current);
  toast(current.includes(key) ? `«${key}» добавлена` : `«${key}» убрана`);
}

function toggleGov(){
  const current = getMyFactions();
  const allSelected = GOV_KEYS.every(k => current.includes(k));
  if (allSelected){
    setMyFactions(current.filter(k => !GOV_KEYS.includes(k)));
    toast('GOV убран');
  } else {
    const set = new Set(current);
    GOV_KEYS.forEach(k => set.add(k));
    setMyFactions(Array.from(set));
    toast('GOV добавлен');
  }
}

function removeGov(){
  setMyFactions(getMyFactions().filter(k => !GOV_KEYS.includes(k)));
  toast('GOV убран');
}

function selectAllFactions(){
  if (!leaderData) return;
  setMyFactions(Object.keys(leaderData));
  toast('Выбраны все фракции');
}

function deselectAllFactions(){
  setMyFactions([]);
  toast('Выбор сброшен — показывается всё');
}

/* ---------- рендер ---------- */

function renderFactionToggles(){
  const container = document.getElementById('settingsCategories');
  if (!leaderData){
    container.innerHTML = '<div class="empty-state">Фракции появятся после загрузки данных с форума.</div>';
    return;
  }
  const my = getMyFactions();

  const groups = {};
  Object.keys(leaderData).forEach(key => {
    if (GOV_KEYS.includes(key)) return; // они схлопнуты в один переключатель GOV
    const cat = leaderData[key].category || 'other';
    (groups[cat] ??= []).push(key);
  });
  (groups['gov'] ??= []).unshift('__GOV__');

  const sortedCats = Object.keys(groups).sort((a, b) =>
    CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

  let html = '';
  sortedCats.forEach(cat => {
    const items = groups[cat];
    if (!items.length) return;
    html += `<div class="settings-category">
      <div class="cat-title">${CATEGORY_NAMES[cat] || escapeHtml(cat)}</div>
      <div class="faction-toggle-grid">`;
    items.forEach(key => {
      if (key === '__GOV__'){
        const active = GOV_KEYS.every(k => my.includes(k));
        html += `<div class="faction-toggle-item${active ? ' active' : ''}" data-gov="1" role="button" tabindex="0">
          <span class="indicator"></span><span class="label-text">GOV</span>
        </div>`;
      } else {
        const active = my.includes(key);
        html += `<div class="faction-toggle-item${active ? ' active' : ''}" data-key="${escapeHtml(key)}" role="button" tabindex="0" title="${escapeHtml(key)}">
          <span class="indicator"></span><span class="label-text">${escapeHtml(key)}</span>
        </div>`;
      }
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}

function renderMyFactionsChips(){
  const container = document.getElementById('myFactionsChips');
  const display = getDisplayFactions();
  if (!display.length){
    container.innerHTML = '<span class="empty-chips">Не выбрано ни одной фракции — показывается всё.</span>';
    return;
  }
  container.innerHTML = display.map(f => f === 'GOV'
    ? `<span class="chip">GOV<span class="remove" data-remove-gov="1" title="Убрать">✕</span></span>`
    : `<span class="chip">${escapeHtml(f)}<span class="remove" data-remove-key="${escapeHtml(f)}" title="Убрать">✕</span></span>`
  ).join('');
}
