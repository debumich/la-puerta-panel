/* ============================================================
   Авторизация.
   Приложение полностью закрыто до входа. Роль определяется
   каждый раз заново (админ — по списку, лидер — по документу
   в Firestore). В localStorage роль НЕ кэшируется — подделать
   её через консоль бессмысленно, права всё равно проверяет
   Firestore Security Rules на сервере.
   ============================================================ */

let _pendingAuthMsg = null;   // сообщение, которое надо показать после signOut
let _autoRefreshTimer = null;

function initAuth(){
  // сессия живёт в браузере между заходами (важно для GitHub Pages)
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  // если вход шёл через redirect (fallback при блокировке попапов)
  auth.getRedirectResult().catch(err => {
    if (err && err.code !== 'auth/no-auth-event') showAuthMessage(humanAuthError(err), true);
  });

  auth.onAuthStateChanged(async user => {
    if (!user){
      currentUser = null;
      showAuthScreen();
      return;
    }

    showAuthMessage('Проверяем доступ…');
    let role = null;
    try {
      role = await resolveRole(user);
    } catch (err){
      console.error('Ошибка проверки прав:', err);
      _pendingAuthMsg = { text: 'Не удалось проверить права. Попробуйте войти ещё раз.', error: true };
      await auth.signOut();
      return;
    }

    if (!role){
      _pendingAuthMsg = {
        text: `Аккаунт ${user.email} не привязан ни к одной фракции. Обратитесь к администратору.`,
        error: true
      };
      await auth.signOut();
      return;
    }

    currentUser = role;
    enterApp();
  });
}

async function resolveRole(user){
  const email = (user.email || '').toLowerCase();
  if (!email) return null;

  if (ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)){
    return { role: 'admin', email };
  }

  const doc = await db.collection('users').doc(email).get();
  if (doc.exists && doc.data().faction){
    // side ('gov' | 'crime') определится после загрузки данных форума
    return { role: 'leader', email, faction: doc.data().faction, side: null };
  }
  return null;
}

async function login(){
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  showAuthMessage('');
  try {
    await auth.signInWithPopup(provider);
  } catch (err){
    if (err.code === 'auth/popup-blocked'){
      // попап заблокирован — уходим через redirect
      auth.signInWithRedirect(provider);
      return;
    }
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request'){
      return; // пользователь сам закрыл окно — это не ошибка
    }
    console.error(err);
    showAuthMessage(humanAuthError(err), true);
  }
}

function logout(){
  auth.signOut().then(() => toast('Вы вышли из аккаунта'));
}

function humanAuthError(err){
  const map = {
    'auth/network-request-failed': 'Нет соединения с сетью. Проверьте интернет.',
    'auth/unauthorized-domain': 'Этот домен не добавлен в Firebase → Authentication → Authorized domains.',
    'auth/too-many-requests': 'Слишком много попыток. Подождите пару минут.'
  };
  return map[err.code] || ('Ошибка входа: ' + (err.message || err.code || 'неизвестная'));
}

/* ---------- переключение экранов ---------- */

function showAuthScreen(){
  document.getElementById('app').hidden = true;
  document.getElementById('authScreen').hidden = false;
  document.getElementById('header-root').innerHTML = '';

  if (_autoRefreshTimer){ clearInterval(_autoRefreshTimer); _autoRefreshTimer = null; }

  if (_pendingAuthMsg){
    showAuthMessage(_pendingAuthMsg.text, _pendingAuthMsg.error);
    _pendingAuthMsg = null;
  } else {
    showAuthMessage('');
  }
}

function showAuthMessage(text, isError){
  const el = document.getElementById('authState');
  el.textContent = text || '';
  el.classList.toggle('error', !!isError);
}

function enterApp(){
  document.getElementById('authScreen').hidden = true;
  document.getElementById('app').hidden = false;

  renderHeader();
  switchTab('leaders');
  toast(currentUser.role === 'admin'
    ? 'Добро пожаловать, администратор'
    : `Добро пожаловать, лидер ${currentUser.faction}`);

  bootData();
}

/* Загрузка данных после входа */
function bootData(){
  renderLeadersSkeleton();
  loadCachedLeaders();
  if (leaderData) applyLeaderData();   // мгновенно показываем кэш
  fetchLeaders(false);                 // и тут же тянем свежее

  refreshReports();

  if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);
  _autoRefreshTimer = setInterval(() => fetchLeaders(false), AUTO_REFRESH_MIN * 60 * 1000);
}
