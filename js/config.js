/* ============================================================
   La Puerta · конфигурация и глобальное состояние
   ============================================================ */

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

/* Прокси, отдающий данные лидеров с форума */
const API_URL = 'https://la-puerta-proxy.vercel.app/';

/* Админы.
   ВАЖНО: этот список — только для интерфейса. Реальные права
   проверяются на сервере в firestore.rules — там должен быть
   ТОТ ЖЕ список email. Иначе защита не работает. */
const ADMIN_EMAILS = ['azovskiyr@ya.ru'];

const CATEGORY_NAMES = {
  gov:       'Государственные',
  judicial:  'Судебная власть',
  street:    'Уличные группировки',
  syndicate: 'Преступные синдикаты',
  other:     'Другие'
};
const CATEGORY_ORDER = ['gov', 'judicial', 'street', 'syndicate', 'other'];

/* Стороны. От того, к какой стороне относится фракция лидера,
   зависит, что он вообще видит в панели. */
const SIDE_CATEGORIES = {
  gov:   ['gov', 'judicial'],
  crime: ['street', 'syndicate', 'other']
};

/* Ключи, образующие сводный переключатель GOV в настройках */
const GOV_KEYS = ['GOV', 'Генеральный прокурор', 'Председатель Верховного суда'];

const TERM_DAYS = 30;          // длительность одного срока, дней
const AUTO_REFRESH_MIN = 10;   // тихое автообновление данных форума, минут

/* ---------- глобальное состояние ---------- */
let leaderData  = null;  // данные с форума: { 'LSPD': {...}, ... }
let currentUser = null;  // { role:'admin', email } | { role:'leader', email, faction, side }

const ui = {
  search: '',            // строка поиска на странице лидеров
  statusFilter: null,    // фильтр по статусу: green|yellow|red|expired|vacant|null
  reportSide: 'gov',     // активная вкладка отчётов у админа: gov|crime
  managerSearch: ''      // поиск в списке привязанных лидеров
};
