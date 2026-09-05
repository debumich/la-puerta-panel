function toast(msg, type) {
  const t =
    document.getElementById(
      "toast"
    );

  t.textContent = msg;

  t.classList.toggle(
    "error",
    type === "error"
  );

  t.classList.add("show");

  clearTimeout(toast._h);

  toast._h = setTimeout(
    () => {
      t.classList.remove(
        "show"
      );
    },
    3200
  );
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#39;"
    );
}

function debounce(fn, ms) {
  let h;

  return (...args) => {
    clearTimeout(h);

    h = setTimeout(
      () => fn(...args),
      ms
    );
  };
}

function todayISO() {
  const d =
    new Date();

  const p = (n) =>
    String(n).padStart(
      2,
      "0"
    );

  return `${d.getFullYear()}-${p(
    d.getMonth() + 1
  )}-${p(d.getDate())}`;
}

function parseDate(str) {
  if (!str) {
    return null;
  }

  const m =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(
      String(str).trim()
    );

  if (!m) {
    return null;
  }

  const d = new Date(
    +m[3],
    +m[2] - 1,
    +m[1]
  );

  return Number.isNaN(
    d.getTime()
  )
    ? null
    : d;
}

function isoToDate(str) {
  if (!str) {
    return null;
  }

  const d =
    new Date(
      `${str}T00:00:00`
    );

  return Number.isNaN(
    d.getTime()
  )
    ? null
    : d;
}

function formatDate(str) {
  if (!str) {
    return "—";
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      str
    )
  ) {
    const [
      y,
      m,
      d
    ] =
      str.split("-");

    return `${d}.${m}.${y}`;
  }

  return str;
}

function daysLeftInfo(
  appointedDateStr,
  termText
) {
  const d =
    parseDate(
      appointedDateStr
    );

  if (!d) {
    return {
      status: "unknown",
      badgeClass:
        "badge-grey",
      text:
        "Дата уточняется",
      deadline: null
    };
  }

  let termNumber = 1;

  const m =
    String(
      termText || ""
    ).match(
      /(\d+)\s*-й\s*срок/i
    );

  if (m) {
    termNumber =
      parseInt(
        m[1],
        10
      );
  }

  const deadline =
    new Date(
      d.getTime() +
        termNumber *
          TERM_DAYS *
          86400000
    );

  const diffDays =
    Math.ceil(
      (deadline -
        new Date()) /
        86400000
    );

  if (diffDays < 0) {
    return {
      status: "expired",
      badgeClass:
        "badge-red",
      text: `истёк ${Math.abs(
        diffDays
      )} дн. назад`,
      deadline
    };
  }

  if (diffDays <= 3) {
    return {
      status: "red",
      badgeClass:
        "badge-red",
      text: `${diffDays} дн. осталось`,
      deadline
    };
  }

  if (diffDays <= 10) {
    return {
      status: "yellow",
      badgeClass:
        "badge-yellow",
      text: `${diffDays} дн. осталось`,
      deadline
    };
  }

  return {
    status: "green",
    badgeClass:
      "badge-green",
    text: `${diffDays} дн. осталось`,
    deadline
  };
}

function warningsClass(v) {
  const m =
    /^(\d+)\s*\/\s*(\d+)$/.exec(
      String(v || "").trim()
    );

  if (!m) {
    return "";
  }

  const n =
    parseInt(
      m[1],
      10
    );

  if (n <= 0) {
    return "warn-ok";
  }

  if (n === 1) {
    return "warn-mid";
  }

  return "warn-bad";
}

function getEntryDeadline(
  entry
) {
  return (
    daysLeftInfo(
      entry?.appointedDate,
      entry?.term
    )?.deadline ||
    null
  );
}

function isCurrentLeaderActive() {
  if (
    !currentUser ||
    currentUser.role !==
      "leader" ||
    !leaderData?.[
      currentUser.faction
    ]
  ) {
    return false;
  }

  const entry =
    leaderData[
      currentUser.faction
    ];

  if (
    !entry.nickname ||
    String(
      entry.nickname
    ).trim() === "-"
  ) {
    return false;
  }

  const d =
    getEntryDeadline(
      entry
    );

  return (
    !d ||
    d.getTime() >=
      Date.now()
  );
}

function initials(
  name,
  email
) {
  const s =
    String(
      name ||
        email ||
        "?"
    ).trim();

  return s
    ? s
        .split(/\s+/)
        .slice(0, 2)
        .map(
          (x) => x[0]
        )
        .join("")
        .toUpperCase()
    : "?";
}

const STATUS_ORDER = {
  expired: 0,
  red: 1,
  yellow: 2,
  green: 3,
  vacant: 4,
  unknown: 5
};

let _confirmResolve =
  null;

function confirmDialog({
  title = "Подтверждение",
  text = "",
  okText = "Подтвердить"
} = {}) {
  document.getElementById(
    "confirmTitle"
  ).textContent = title;

  document.getElementById(
    "confirmText"
  ).textContent = text;

  document.getElementById(
    "confirmOk"
  ).textContent = okText;

  document
    .getElementById(
      "confirmOverlay"
    )
    .classList.add("open");

  return new Promise(
    (resolve) => {
      _confirmResolve =
        resolve;
    }
  );
}

function closeConfirm(
  result
) {
  document
    .getElementById(
      "confirmOverlay"
    )
    .classList.remove("open");

  if (_confirmResolve) {
    _confirmResolve(
      result
    );

    _confirmResolve =
      null;
  }
}
