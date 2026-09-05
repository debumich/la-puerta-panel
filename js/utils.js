/* ============================================================
   Утилиты: тосты, экранирование, даты, confirm-диалог
   ============================================================ */

function toast(msg, type){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', type === 'error');
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove('show'), 3000);
}

/* Экранирование без DOM — безопасно и для текста, и для атрибутов */
function escapeHtml(v){
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function debounce(fn, ms){
  let h;
  return (...args) => { clearTimeout(h); h = setTimeout(() => fn(...args), ms); };
}

function todayISO(){
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* Форум отдаёт даты в формате dd/mm/yyyy */
function parseDate(str){
  if (!str) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str.trim());
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}

/* Сколько дней осталось у лидера: срок = номер_срока × TERM_DAYS от даты назначения */
function daysLeftInfo(appointedDateStr, termText){
  const d = parseDate(appointedDateStr);
  if (!d) return { status: 'unknown', badgeClass: 'badge-grey', text: 'Дата уточняется' };

  let termNumber = 1;
  if (termText){
    const m = termText.match(/(\d+)-й\s*срок/);
    if (m) termNumber = parseInt(m[1], 10);
  }
  const deadline = new Date(d.getTime() + termNumber * TERM_DAYS * 86400000);
  const diffDays = Math.ceil((deadline - new Date()) / 86400000);

  if (diffDays < 0)   return { status: 'expired', badgeClass: 'badge-red',    text: `истёк ${Math.abs(diffDays)} дн. назад` };
  if (diffDays <= 3)  return { status: 'red',     badgeClass: 'badge-red',    text: `${diffDays} дн. осталось` };
  if (diffDays <= 10) return { status: 'yellow',  badgeClass: 'badge-yellow', text: `${diffDays} дн. осталось` };
  return               { status: 'green',   badgeClass: 'badge-green',  text: `${diffDays} дн. осталось` };
}

/* Класс для счётчика предупреждений вида "1 / 3" */
function warningsClass(warnStr){
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec((warnStr || '').trim());
  if (!m) return '';
  const n = parseInt(m[1], 10);
  if (n <= 0) return 'warn-ok';
  if (n === 1) return 'warn-mid';
  return 'warn-bad';
}

/* Порядок сортировки карточек по срочности */
const STATUS_ORDER = { expired: 0, red: 1, yellow: 2, green: 3, vacant: 4, unknown: 5 };

/* ---------- Красивый confirm вместо системного ---------- */
let _confirmResolve = null;

function confirmDialog({ title = 'Подтверждение', text = '', okText = 'Удалить' } = {}){
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmOk').textContent = okText;
  document.getElementById('confirmOverlay').classList.add('open');
  return new Promise(resolve => { _confirmResolve = resolve; });
}

function closeConfirm(result){
  document.getElementById('confirmOverlay').classList.remove('open');
  if (_confirmResolve){ _confirmResolve(result); _confirmResolve = null; }
}
