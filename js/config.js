const firebaseConfig = {
  apiKey: "AIzaSyA17bA1P5e8KSB2GK-LwVoiwgG4RvaT3P8",
  authDomain: "admin-panel-63d23.firebaseapp.com",
  projectId: "admin-panel-63d23",
  storageBucket: "admin-panel-63d23.firebasestorage.app",
  messagingSenderId: "981102642717",
  appId: "1:981102642717:web:63ad5f83ab7ca93635a8f4",
  measurementId: "G-J5SP4MJTDE"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const FieldValue = firebase.firestore.FieldValue;

const API_URL = 'https://la-puerta-proxy.vercel.app/';
const API_TIMEOUT_MS = 15000;
const AUTO_REFRESH_MIN = 10;
const TERM_DAYS = 30;
const PRESENCE_HEARTBEAT_MS = 30000;
const PRESENCE_ONLINE_WINDOW_MS = 90000;
const PRESENCE_IDLE_MS = 10 * 60 * 1000;
const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const ROLES = {
  user: 'Пользователь',
  leader: 'Лидер',
  curator_assistant: 'Помощник куратора',
  curator: 'Куратор',
  server_admin: 'Администратор сервера',
  site_admin: 'Администратор сайта'
};
const STAFF_ROLES = ['curator_assistant', 'curator', 'server_admin'];

const LEVELS = {
  1: 'Хелпер 1 уровня',
  2: 'Хелпер 2 уровня',
  3: 'Администратор 3 уровня',
  4: 'Администратор 4 уровня',
  5: 'Старший администратор',
  6: 'Главный администратор'
};

const PERMISSIONS = {
  viewReports: 'Просмотр отчётов',
  manageReports: 'Создание отчётов',
  editLeaderNickname: 'Изменение никнейма лидера',
  manageDuties: 'Управление обязанностями',
  manageLeaderPoints: 'Выдача Active Points',
  approvePointRequests: 'Подтверждение заявок Active Points',
  viewAudit: 'Просмотр журнала действий',
  manageArchive: 'Управление архивом',
  manageUsers: 'Управление пользователями',
  manageAdmins: 'Управление администраторами'
};

const CATEGORY_NAMES = {
  gov: 'Государственные структуры',
  judicial: 'Судебная власть',
  street: 'Уличные банды',
  syndicate: 'Преступные синдикаты',
  other: 'Другое'
};
const CATEGORY_ORDER = ['gov', 'judicial', 'street', 'syndicate', 'other'];

const ARCHIVE_RESULTS = [
  'Успешно завершил срок',
  'Успешно завершила срок',
  'Ушёл по собственному желанию',
  'Был снят',
  'Завершил 3 срока'
];

const TAB_TITLES = {
  dashboard: 'Главная',
  leaders: 'Лидеры',
  archive: 'Архив лидеров',
  reports: 'Отчёты',
  profile: 'Профиль',
  users: 'Пользователи',
  factions: 'Фракции'
};

const state = {
  authUser: null,
  user: null,
  forum: null,
  forumTime: null,
  factions: [],
  factionsById: {},
  factionsByForumKey: {},
  tab: null,
  search: '',
  statusFilter: null,
  archiveSearch: '',
  archiveShowDeleted: false,
  reportsShowDeleted: false,
  usersSearch: ''
};
