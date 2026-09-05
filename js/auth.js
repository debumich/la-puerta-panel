let _userUnsub = null;

function initAuth(){
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
  auth.getRedirectResult().catch(err => {
    if (err && err.code !== 'auth/no-auth-event') failToast(err, 'Не удалось войти');
  });
  auth.onAuthStateChanged(async user => {
    if (_userUnsub){ _userUnsub(); _userUnsub = null; }
    if (!user){
      state.authUser = null;
      state.user = null;
      stopPresence();
      onSessionChanged();
      return;
    }
    state.authUser = user;
    try {
      await ensureUserDoc(user);
    } catch (err){
      failToast(err, 'Не удалось подготовить профиль');
      await auth.signOut();
      return;
    }
    _userUnsub = db.collection('users').doc(user.uid).onSnapshot(snap => {
      const prevRole = state.user ? state.user.systemRole : null;
      const prevActive = state.user ? state.user.active : null;
      state.user = snap.exists ? normalizeUser(user.uid, snap.data()) : null;
      if (state.user && state.user.active === false){
        state.user = null;
        toast('Ваш аккаунт отключён администратором сайта', 'error');
        auth.signOut();
        return;
      }
      if (!state.user){
        onSessionChanged();
        return;
      }
      const roleChanged = prevRole !== null && prevRole !== state.user.systemRole;
      onSessionChanged(roleChanged || prevActive === null);
      if (roleChanged) toast('Ваши права были изменены администратором сайта');
    }, err => {
      failToast(err, 'Не удалось получить данные профиля');
      auth.signOut();
    });
    startPresence();
  });
}

function normalizeUser(uid, d){
  return {
    uid,
    email: d.email || '',
    displayName: typeof d.displayName === 'string' ? d.displayName : '',
    avatarUrl: typeof d.avatarUrl === 'string' ? d.avatarUrl : '',
    serverLevel: Number.isInteger(d.serverLevel) ? d.serverLevel : 1,
    systemRole: ROLES[d.systemRole] ? d.systemRole : 'user',
    faction: typeof d.faction === 'string' && d.faction ? d.faction : null,
    curatedFactions: Array.isArray(d.curatedFactions) ? d.curatedFactions.filter(x => typeof x === 'string') : [],
    permissions: Array.isArray(d.permissions) ? d.permissions.filter(x => typeof x === 'string') : [],
    reportEditingEnabled: d.reportEditingEnabled === true,
    active: d.active !== false,
    createdAt: d.createdAt || null,
    updatedAt: d.updatedAt || null
  };
}

async function ensureUserDoc(user){
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return;
  await ref.set({
    uid: user.uid,
    email: (user.email || '').toLowerCase(),
    displayName: user.displayName || '',
    avatarUrl: '',
    serverLevel: 1,
    systemRole: 'user',
    faction: null,
    curatedFactions: [],
    permissions: [],
    reportEditingEnabled: false,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
}

async function login(){
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await auth.signInWithPopup(provider);
  } catch (err){
    if (err.code === 'auth/popup-blocked'){ auth.signInWithRedirect(provider); return; }
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
    failToast(err, 'Не удалось войти');
  }
}

async function logout(){
  try {
    await stopPresenceAndSignalOffline();
    await auth.signOut();
    toast('Вы вышли из аккаунта');
  } catch (err){
    failToast(err, 'Не удалось выйти');
  }
}
