const firebaseConfig = {
  apiKey: "AIzaSyA17aB1P5e8KSB2GK-LwVoiwgG4RvaT3P8",
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

const API_URL =
  "https://la-puerta-proxy.vercel.app/";

const ADMIN_EMAILS = [
  "azovskiyr@ya.ru"
];

const CATEGORY_NAMES = {
  gov: "Государственные",
  judicial: "Судебная власть",
  street: "Уличные группировки",
  syndicate: "Преступные синдикаты",
  other: "Другие"
};

const CATEGORY_ORDER = [
  "gov",
  "judicial",
  "street",
  "syndicate",
  "other"
];

const SIDE_CATEGORIES = {
  gov: [
    "gov",
    "judicial",
    "street",
    "syndicate",
    "other"
  ],
  crime: [
    "gov",
    "judicial",
    "street",
    "syndicate",
    "other"
  ]
};

const GOV_KEYS = [
  "GOV",
  "Генеральный прокурор",
  "Председатель Верховного суда"
];

const TERM_DAYS = 30;
const AUTO_REFRESH_MIN = 10;

let leaderData = null;
let currentUser = null;
let profileData = {};

const ui = {
  search: "",
  statusFilter: null,
  managerSearch: "",
  reportFactionFilter: "",
  historyFactionFilter: "",
  historyStart: "",
  historyEnd: ""
};
