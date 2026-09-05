function renderHeader() {
  const root = document.getElementById("header-root");

  if (!currentUser) {
    root.innerHTML = "";
    return;
  }

  const isPublic = currentUser.role === "public";
  const isAdmin = currentUser.role === "admin";

  const tabs = isPublic
    ? [
        {
          id: "leaders",
          label: "Лидеры"
        }
      ]
    : [
        {
          id: "home",
          label: "Главная"
        },
        {
          id: "leaders",
          label: "Лидеры"
        }
      ];

  if (!isPublic) {
    tabs.push(
      {
        id: "reports",
        label: "Отчёты"
      },
      {
        id: "history",
        label: "Архив лидеров"
      },
      {
        id: "support",
        label: "Баги и предложения"
      },
      {
        id: "profile",
        label: "Профиль"
      }
    );
  }

  if (isAdmin) {
    tabs.push(
      {
        id: "manager",
        label: "Управление"
      },
      {
        id: "settings",
        label: "Настройки"
      }
    );
  }

  const display =
    currentUser.displayName ||
    currentUser.email ||
    "Гость";

  const avatar = currentUser.avatarUrl
    ? `<img class="avatar" src="${escapeHtml(
        currentUser.avatarUrl
      )}" alt="">`
    : `<div class="avatar">${escapeHtml(
        initials(display, currentUser.email)
      )}</div>`;

  root.innerHTML = `
    <header class="header">
      <div class="header-left">

        <a class="logo-link" data-tab="home">
          <img
            src="Header.png"
            alt="La Puerta"
            class="header-logo"
          >
        </a>

        <nav class="header-tabs">
          ${tabs
            .map(
              (t) =>
                `<button class="tab-btn" data-tab="${t.id}">${t.label}</button>`
            )
            .join("")}
        </nav>

      </div>

      <div class="header-user">

        <div class="user-meta">
          <span class="role-badge ${
            isAdmin ? "role-admin" : ""
          }">
            ${
              isPublic
                ? "Гость"
                : isAdmin
                ? "Администратор"
                : `Лидер — ${escapeHtml(
                    currentUser.faction
                  )}`
            }
          </span>

          <span class="user-email">
            ${escapeHtml(
              currentUser.email ||
                "Публичный просмотр"
            )}
          </span>
        </div>

        ${avatar}

        ${
          isPublic
            ? `<button class="btn btn-ghost" id="loginHeaderBtn">Войти</button>`
            : `<button class="btn btn-icon" id="logoutBtn" title="Выйти">↪</button>`
        }

      </div>
    </header>
  `;

  document
    .querySelectorAll("#header-root .tab-btn")
    .forEach((b) => {
      b.classList.toggle(
        "active",
        b.dataset.tab ===
          (isPublic ? "leaders" : "home")
      );
    });

  const loginButton =
    document.getElementById("loginHeaderBtn");

  if (loginButton) {
    loginButton.addEventListener("click", login);
  }

  const logoutButton =
    document.getElementById("logoutBtn");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }
}

function setActiveTab(tab) {
  document
    .querySelectorAll("#header-root .tab-btn")
    .forEach((b) => {
      b.classList.toggle(
        "active",
        b.dataset.tab === tab
      );
    });
}
