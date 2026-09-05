let managerCache = null;

async function loadLeadersList(
  force = false
) {
  if (
    currentUser?.role !==
    "admin"
  ) {
    return;
  }

  const root =
    document.getElementById(
      "leadersListRoot"
    );

  if (!managerCache || force) {
    try {
      const snap =
        await db
          .collection("users")
          .get();

      managerCache =
        snap.docs
          .map((d) => ({
            email: d.id,
            ...d.data()
          }))
          .sort(
            (a, b) =>
              (
                a.faction || ""
              ).localeCompare(
                b.faction || ""
              ) ||
              a.email.localeCompare(
                b.email
              )
          );
    } catch (err) {
      root.innerHTML = `
        <div class="empty-state">
          Не удалось загрузить список лидеров.
          Проверьте правила Firestore.
        </div>
      `;

      return;
    }
  }

  const q =
    ui.managerSearch
      .trim()
      .toLowerCase();

  const rows = q
    ? managerCache.filter(
        (x) =>
          x.email
            .toLowerCase()
            .includes(q) ||
          (
            x.faction || ""
          )
            .toLowerCase()
            .includes(q) ||
          (
            x.displayName || ""
          )
            .toLowerCase()
            .includes(q)
      )
    : managerCache;

  document.getElementById(
    "leadersCount"
  ).textContent =
    managerCache.length;

  if (!rows.length) {
    root.innerHTML = `
      <div class="empty-state">
        Нет подходящих лидеров.
      </div>
    `;

    return;
  }

  root.innerHTML = `
    <table class="leader-table">

      <thead>
        <tr>
          <th>Профиль</th>
          <th>Email</th>
          <th>Фракция</th>
          <th></th>
        </tr>
      </thead>

      <tbody>

        ${rows
          .map((x) => {
            const av = x.avatarUrl
              ? `
                <img
                  class="manager-avatar"
                  src="${escapeHtml(
                    x.avatarUrl
                  )}"
                  alt=""
                >
              `
              : `
                <span class="avatar-mini">
                  ${escapeHtml(
                    initials(
                      x.displayName,
                      x.email
                    )
                  )}
                </span>
              `;

            return `
              <tr>

                <td>
                  <div class="manager-person">
                    ${av}
                    <span>
                      ${escapeHtml(
                        x.displayName ||
                          "Без имени"
                      )}
                    </span>
                  </div>
                </td>

                <td>
                  ${escapeHtml(
                    x.email
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    x.faction ||
                      "—"
                  )}
                </td>

                <td style="text-align:right">
                  <button
                    class="remove-btn"
                    data-remove-leader="${escapeHtml(
                      x.email
                    )}"
                  >
                    Удалить
                  </button>
                </td>

              </tr>
            `;
          })
          .join("")}

      </tbody>

    </table>
  `;
}

async function addLeader() {
  const email =
    document
      .getElementById(
        "newLeaderEmail"
      )
      .value.trim()
      .toLowerCase();

  const faction =
    document.getElementById(
      "newLeaderFaction"
    ).value;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    ) ||
    !faction
  ) {
    return toast(
      "Проверьте email и фракцию",
      "error"
    );
  }

  const old =
    managerCache?.find(
      (x) =>
        x.email === email
    );

  if (
    old &&
    old.faction !== faction
  ) {
    const ok =
      await confirmDialog({
        title:
          "Перепривязать лидера?",
        text: `${email} уже привязан к «${old.faction}». Переназначить?`,
        okText:
          "Перепривязать"
      });

    if (!ok) {
      return;
    }
  }

  try {
    await db
      .collection("users")
      .doc(email)
      .set(
        {
          faction,
          displayName:
            old?.displayName || "",
          avatarUrl:
            old?.avatarUrl || "",
          updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
        },
        {
          merge: true
        }
      );

    document.getElementById(
      "newLeaderEmail"
    ).value = "";

    toast(
      `Лидер ${email} привязан к «${faction}»`
    );

    await loadLeadersList(true);
  } catch (err) {
    toast(
      "Не удалось привязать лидера: " +
        (err.message ||
          "нет прав"),
      "error"
    );
  }
}

async function removeLeader(
  email
) {
  const ok =
    await confirmDialog({
      title:
        "Отозвать доступ?",
      text: `${email} больше не сможет войти как лидер. Его отчёты и история не удаляются.`,
      okText: "Отозвать"
    });

  if (!ok) {
    return;
  }

  try {
    await db
      .collection("users")
      .doc(email)
      .delete();

    toast(
      "Доступ отозван"
    );

    await loadLeadersList(true);
  } catch (err) {
    toast(
      "Не удалось отозвать доступ",
      "error"
    );
  }
}

function fillManagerFactionSelect() {
  const s =
    document.getElementById(
      "newLeaderFaction"
    );

  if (!leaderData) {
    s.innerHTML = `
      <option value="">
        Данные загружаются…
      </option>
    `;

    return;
  }

  const prev = s.value;

  s.innerHTML =
    `
      <option value="">
        Выберите фракцию
      </option>
    ` +
    CATEGORY_ORDER.filter(
      (c) =>
        Object.keys(
          leaderData
        ).some(
          (k) =>
            (
              leaderData[k]
                .category ||
              "other"
            ) === c
        )
    )
      .map(
        (c) => `
          <optgroup
            label="${escapeHtml(
              CATEGORY_NAMES[c]
            )}"
          >

            ${Object.keys(
              leaderData
            )
              .filter(
                (k) =>
                  (
                    leaderData[k]
                      .category ||
                    "other"
                  ) === c
              )
              .sort()
              .map(
                (k) => `
                  <option value="${escapeHtml(
                    k
                  )}">
                    ${escapeHtml(
                      k
                    )}
                  </option>
                `
              )
              .join("")}

          </optgroup>
        `
      )
      .join("");

  if (
    prev &&
    leaderData[prev]
  ) {
    s.value = prev;
  }
}
