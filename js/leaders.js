function factionSide() {
  return "all";
}

function visibleCategories() {
  return currentUser?.role
    ? CATEGORY_ORDER.slice()
    : [];
}

async function fetchLeaders(force) {
  const btn =
    document.getElementById("refreshBtn");

  if (btn) {
    btn.classList.add("loading");
  }

  try {
    const url =
      API_URL +
      (API_URL.includes("?") ? "&" : "?") +
      (force ? "refresh=1&" : "") +
      "_=" +
      Date.now();

    const res = await fetch(url, {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!data?.leaders) {
      throw new Error("Пустой ответ API");
    }

    leaderData = data.leaders;

    localStorage.setItem(
      "leaderData",
      JSON.stringify(leaderData)
    );

    localStorage.setItem(
      "leaderDataTime",
      data.lastUpdate ||
        new Date().toISOString()
    );

    applyLeaderData();

    if (force) {
      toast("Данные обновлены");
    }
  } catch (err) {
    console.error(err);

    if (leaderData) {
      applyLeaderData();

      toast(
        "Сервер недоступен — показаны сохранённые данные",
        "error"
      );
    } else {
      renderLeadersError();
    }
  } finally {
    if (btn) {
      btn.classList.remove("loading");
    }

    updateNote();
  }
}

function applyLeaderData() {
  if (
    currentUser?.role === "leader" &&
    leaderData?.[currentUser.faction]
  ) {
    currentUser.side = "all";
  }

  renderLeaders();

  if (typeof initReportForm === "function") {
    initReportForm();
  }

  if (
    typeof fillHistoryFactionSelect ===
    "function"
  ) {
    fillHistoryFactionSelect();
  }

  if (
    typeof fillManagerFactionSelect ===
    "function"
  ) {
    fillManagerFactionSelect();
  }
}

function updateNote() {
  const el =
    document.getElementById("updateNote");

  const t = localStorage.getItem(
    "leaderDataTime"
  );

  if (!t) {
    el.textContent = "";
    return;
  }

  el.textContent =
    "обновлено " +
    new Date(t).toLocaleString(
      "ru-RU",
      {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }
    );
}

function renderLeadersSkeleton() {
  document.getElementById(
    "statsRow"
  ).innerHTML = Array.from(
    {
      length: 5
    },
    () => '<div class="skel-card"></div>'
  ).join("");

  document.getElementById(
    "leadersRoot"
  ).innerHTML =
    '<div class="skel-grid">' +
    Array.from(
      {
        length: 8
      },
      () => '<div class="skel-card"></div>'
    ).join("") +
    "</div>";
}

function renderLeadersError() {
  document.getElementById(
    "statsRow"
  ).innerHTML = "";

  document.getElementById(
    "leadersRoot"
  ).innerHTML = `
    <div class="empty-state">
      Не удалось загрузить данные с форума.<br>
      <button
        class="btn btn-primary"
        data-action="retry-leaders"
      >
        Повторить
      </button>
    </div>
  `;
}

function renderStats(scoped) {
  const count = (status) =>
    scoped.filter(
      (x) => x.info.status === status
    ).length;

  const chips = [
    {
      key: null,
      label: "Всего",
      value: scoped.length,
      tone: ""
    },
    {
      key: "green",
      label: "В норме",
      value: count("green"),
      tone: "green"
    },
    {
      key: "yellow",
      label: "Истекает",
      value: count("yellow"),
      tone: "amber"
    },
    {
      key: "red",
      label: "Критично",
      value: count("red"),
      tone: "red"
    },
    {
      key: "expired",
      label: "Просрочено",
      value: count("expired"),
      tone: "red"
    },
    {
      key: "vacant",
      label: "Не назначено",
      value: count("vacant"),
      tone: "grey"
    }
  ];

  document.getElementById(
    "statsRow"
  ).innerHTML = chips
    .map(
      (c) => `
        <button
          class="stat-chip${
            ui.statusFilter === c.key ||
            (!ui.statusFilter && c.key === null)
              ? " active"
              : ""
          }"
          data-status="${c.key ?? ""}"
          data-tone="${c.tone}"
        >
          <b>${c.value}</b>${c.label}
        </button>
      `
    )
    .join("");
}

function renderLeaders() {
  const root =
    document.getElementById(
      "leadersRoot"
    );

  if (!leaderData || !currentUser) {
    return;
  }

  const scoped = [];

  Object.keys(leaderData).forEach(
    (key) => {
      const entry =
        leaderData[key] || {};

      const category =
        entry.category || "other";

      const isVacant =
        !entry.nickname ||
        String(entry.nickname).trim() ===
          "-";

      const info = isVacant
        ? {
            status: "vacant",
            badgeClass: "badge-grey",
            text: "Не назначено",
            deadline: null
          }
        : daysLeftInfo(
            entry.appointedDate,
            entry.term
          );

      if (currentUser.role === "admin") {
        const mine = getMyFactions();

        if (
          mine.length &&
          !mine.includes(key)
        ) {
          return;
        }
      }

      scoped.push({
        key,
        entry,
        category,
        info
      });
    }
  );

  renderStats(scoped);

  const q =
    ui.search.trim().toLowerCase();

  let visible = q
    ? scoped.filter(
        (x) =>
          x.key
            .toLowerCase()
            .includes(q) ||
          (x.entry.nickname || "")
            .toLowerCase()
            .includes(q)
      )
    : scoped;

  if (ui.statusFilter) {
    visible = visible.filter(
      (x) =>
        x.info.status ===
        ui.statusFilter
    );
  }

  if (!visible.length) {
    root.innerHTML = `
      <div class="empty-state">
        ${
          scoped.length
            ? "Ничего не найдено по текущим фильтрам."
            : "Фракции не найдены."
        }
      </div>
    `;

    return;
  }

  const groups = {};

  visible.forEach((x) => {
    (groups[x.category] ??= []).push(x);
  });

  root.innerHTML = "";

  Object.keys(groups)
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a) -
        CATEGORY_ORDER.indexOf(b)
    )
    .forEach((cat) => {
      const items = groups[cat].sort(
        (a, b) => {
          const d =
            (STATUS_ORDER[
              a.info.status
            ] ?? 9) -
            (STATUS_ORDER[
              b.info.status
            ] ?? 9);

          return (
            d ||
            a.key.localeCompare(b.key)
          );
        }
      );

      const group =
        document.createElement("div");

      group.className = "group";

      group.innerHTML = `
        <div class="group-title">
          ${escapeHtml(
            CATEGORY_NAMES[cat] || cat
          )}
          <span class="count">
            ${items.length}
          </span>
        </div>
      `;

      const grid =
        document.createElement("div");

      grid.className = "card-grid";

      items.forEach((item) => {
        grid.appendChild(
          renderCard(item)
        );
      });

      group.appendChild(grid);
      root.appendChild(group);
    });
}

function renderCard({
  key,
  entry,
  info
}) {
  const card =
    document.createElement("div");

  card.className = "leader-card";
  card.dataset.status =
    info.status;

  const isVacant =
    info.status === "vacant";

  const isMine =
    currentUser.role === "leader" &&
    currentUser.faction === key;

  if (isMine) {
    card.classList.add("mine");
  }

  const meta = [];

  meta.push(`
    <div class="lc-meta-item">
      <div class="label">Назначен</div>
      <div class="value">
        ${escapeHtml(
          entry.appointedDate || "—"
        )}
      </div>
    </div>
  `);

  meta.push(`
    <div class="lc-meta-item">
      <div class="label">Срок</div>
      <div class="value">
        ${escapeHtml(
          entry.term || "—"
        )}
      </div>
    </div>
  `);

  if (
    entry.category ===
    "judicial"
  ) {
    meta.push(`
      <div class="lc-meta-item">
        <div class="label">Предупр.</div>
        <div class="value ${warningsClass(
          entry.warnings
        )}">
          ${escapeHtml(
            entry.warnings ?? "—"
          )}
        </div>
      </div>
    `);
  } else {
    meta.push(`
      <div class="lc-meta-item">
        <div class="label">Баллы</div>
        <div class="value ${
          (parseInt(
            entry.points,
            10
          ) || 0) < 0
            ? "value-negative"
            : ""
        }">
          ${escapeHtml(
            entry.points ?? "—"
          )}
        </div>
      </div>
    `);
  }

  card.innerHTML = `
    <div class="lc-top">
      <div>
        <div class="lc-faction">
          ${escapeHtml(key)}
          ${
            isMine
              ? '<span class="mine-tag">вы</span>'
              : ""
          }
        </div>

        <div class="lc-name">
          ${
            isVacant
              ? "Лидер не назначен"
              : escapeHtml(
                  entry.nickname
                )
          }
        </div>
      </div>

      <span class="badge ${info.badgeClass}">
        ${escapeHtml(info.text)}
      </span>
    </div>

    <div class="lc-meta">
      ${meta.join("")}
    </div>
  `;

  return card;
}
