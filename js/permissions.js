function isSignedIn(){
  return !!state.user && state.user.active === true;
}

function role(){
  return state.user ? state.user.systemRole : null;
}

function isSiteAdmin(){
  return isSignedIn() && role() === 'site_admin';
}

function isStaff(){
  return isSignedIn() && STAFF_ROLES.includes(role());
}

function isLeader(){
  return isSignedIn() && role() === 'leader' && typeof state.user.faction === 'string' && state.user.faction.length > 0;
}

function myFaction(){
  return isLeader() ? state.user.faction : null;
}

function curatedFactions(){
  return isStaff() && Array.isArray(state.user.curatedFactions) ? state.user.curatedFactions : [];
}

function can(perm){
  if (isSiteAdmin()) return true;
  return isStaff() && Array.isArray(state.user.permissions) && state.user.permissions.includes(perm);
}

function curates(factionId){
  if (isSiteAdmin()) return true;
  return curatedFactions().includes(factionId);
}

function canViewReports(){
  return isSiteAdmin() || isLeader() || (isStaff() && can('viewReports'));
}

function canCreateReports(){
  return isSiteAdmin() || isLeader() || (isStaff() && can('manageReports'));
}

function reportFactionIds(){
  if (isSiteAdmin()) return state.factions.filter(f => f.active).map(f => f.id);
  if (isLeader()) return [myFaction()];
  if (isStaff()) return curatedFactions();
  return [];
}

function canAccessTab(tab){
  switch (tab){
    case 'leaders':
    case 'archive':
      return true;
    case 'dashboard':
    case 'profile':
      return isSignedIn();
    case 'reports':
      return canViewReports();
    case 'users':
      return isSiteAdmin() || isStaff();
    case 'factions':
      return isSiteAdmin();
    default:
      return false;
  }
}

function roleLabel(u){
  if (!u) return 'Гость';
  return ROLES[u.systemRole] || 'Пользователь';
}

function levelLabel(n){
  return LEVELS[n] || 'Уровень не задан';
}

function levelClass(n){
  const cls = 'level-badge';
  if (n === 2) return cls + ' level-2';
  if (n === 3) return cls + ' level-3';
  if (n === 4) return cls + ' level-4';
  if (n === 5) return cls + ' level-5';
  return cls;
}