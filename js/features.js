let ticketsCache = null;
let historyCache = null;

function initHistory() {
  if (
    !currentUser ||
    currentUser.role === "public"
  ) {
    return;
  }

  document.getElementById(
    "historyFormCard"
  ).hidden =
    currentUser.role !==
    "admin";

  fillHistoryFactionSelect();
}

function fillHistoryFactionSelect() {
  if (!leaderData) {
    return;
  }

  [
    document.getElementById(
      "historyFactionFilter"
    ),
    document.getElementById(
      "historyFaction"
    )
  ].forEach((s) => {
    const prev = s.value;

    s.innerHTML =
      (
        s.id ===
        "historyFactionFilter"
          ? '<option value="">Все фракции</option>'
          : ""
      ) +
      Object.keys(
        leaderData
      )
        .sort()
        .map(
          (k) =>
            `<option value="${escapeHtml(
              k
            )}">${escapeHtml(
              k
            )}</option>`
        )
        .join("");

    if (prev) {
      s.value = prev;
    }
  });
}

async function loadHistory(
  force = false
) {
  if (
    historyCache &&
    !force
  ) {
    return historyCache;
  }

  try {
    const snap =
      await db
        .collection(
          "leaderHistory"
        )
        .get();

    historyCache =
      snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data()
        }))
        .sort(
          (a, b) =>
            String(
              b.endDate || ""
            ).localeCompare(
              String(
                a.endDate || ""
              )
            )
        );

    return historyCache;
  } catch (err) {
    console.error(err);

    toast(
      "Не удалось загрузить архив лидеров",
      "error"
    );

    return (
      historyCache || []
    );
  }
}

function resultLabel(v) {
  return (
    {
      success:
        "Успешно завершил срок",
      resigned:
        "По собственному желанию",
      removed:
        "Снят с должности",
      three_terms:
        "Завершил 3 срока"
    }[v] ||
    v ||
    "Завершение срока"
  );
}

function renderHistory() {
  if (
    !currentUser ||
    currentUser.role === "public"
  ) {
    return;
  }

  loadHistory().then(
    (rows) => {
      const f =
        ui.historyFactionFilter;

      const start =
        ui.historyStart;

      const end =
        ui.historyEnd;

      rows = rows.filter(
        (r) =>
          (!f ||
            r.faction === f) &&
          (!start ||
            r.endDate >=
              start) &&
          (!end ||
            r.endDate <=
              end)
      );

      document.getElementById(
        "historyCount"
      ).textContent =
        rows.length;

      document.getElementById(
        "historyList"
      ).innerHTML = rows.length
        ? rows
            .map(
              (r) => `
                <div class="history-item">

                  <div class="history-main">

                    <div>
                      <div class="history-faction">
                        Фракция: ${escapeHtml(
                          r.faction
                        )}
                      </div>

                      <div class="history-name">
                        ${escapeHtml(
                          r.name
                        )}
                      </div>

                      <div class="history-dates">
                        ${formatDate(
                          r.startDate
                        )}
                        —
                        ${formatDate(
                          r.endDate
                        )}
                      </div>
                    </div>

                    ${
                      currentUser.role ===
                      "admin"
                        ? `
                          <button
                            class="history-delete"
                            data-history-delete="${escapeHtml(
                              r.id
                            )}"
                          >
                            Удалить
                          </button>
                        `
                        : ""
                    }

                  </div>

                  <div class="history-result">
                    ${escapeHtml(
                      resultLabel(
                        r.result
                      )
                    )}
                  </div>

                  ${
                    r.note
                      ? `
                        <div class="history-note">
                          ${escapeHtml(
                            r.note
                          )}
                        </div>
                      `
                      : ""
                  }

                </div>
              `
            )
            .join("")
        : `
          <div class="empty-state">
            В архиве пока нет записей.
          </div>
        `;
    }
  );
}

async function saveHistory() {
  if (
    currentUser?.role !==
    "admin"
  ) {
    return;
  }

  const data = {
    faction:
      document.getElementById(
        "historyFaction"
      ).value,

    name:
      document.getElementById(
        "historyName"
      ).value.trim(),

    startDate:
      document.getElementById(
        "historyStartDate"
      ).value,

    endDate:
      document.getElementById(
        "historyEndDate"
      ).value,

    result:
      document.getElementById(
        "historyResult"
      ).value,

    note:
      document.getElementById(
        "historyNote"
      ).value.trim(),

    createdBy:
      currentUser.email,

    createdAt:
      firebase.firestore.FieldValue.serverTimestamp()
  };

  if (
    !data.faction ||
    !data.name ||
    !data.startDate ||
    !data.endDate
  ) {
    return toast(
      "Заполните фракцию, имя и даты",
      "error"
    );
  }

  try {
    await db
      .collection(
        "leaderHistory"
      )
      .add(data);

    historyCache = null;

    [
      "historyName",
      "historyStartDate",
      "historyEndDate",
      "historyNote"
    ].forEach((id) => {
      document.getElementById(
        id
      ).value = "";
    });

    toast(
      "Запись добавлена в архив"
    );

    renderHistory();
  } catch (err) {
    toast(
      "Не удалось сохранить запись",
      "error"
    );
  }
}

async function deleteHistory(
  id
) {
  if (
    currentUser?.role !==
    "admin"
  ) {
    return;
  }

  const ok =
    await confirmDialog({
      title:
        "Удалить запись?",
      text:
        "История будет удалена без возможности восстановления.",
      okText: "Удалить"
    });

  if (!ok) {
    return;
  }

  try {
    await db
      .collection(
        "leaderHistory"
      )
      .doc(id)
      .delete();

    historyCache = null;

    toast(
      "Запись удалена"
    );

    renderHistory();
  } catch (err) {
    toast(
      "Не удалось удалить запись",
      "error"
    );
  }
}

async function loadTickets(
  force = false
) {
  if (
    currentUser?.role ===
    "public"
  ) {
    return;
  }

  if (
    ticketsCache &&
    !force
  ) {
    renderTickets();
    return;
  }

  try {
    let q =
      db.collection(
        "supportTickets"
      );

    if (
      currentUser.role !==
      "admin"
    ) {
      q = q.where(
        "authorEmail",
        "==",
        currentUser.email
      );
    }

    const snap =
      await q.get();

    ticketsCache =
      snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data()
        }))
        .sort(
          (a, b) =>
            (b.createdAt
              ?.seconds ||
              0) -
            (a.createdAt
              ?.seconds ||
              0)
        );

    renderTickets();
  } catch (err) {
    console.error(err);

    document.getElementById(
      "ticketsList"
    ).innerHTML = `
      <div class="empty-state">
        Не удалось загрузить заявки.
      </div>
    `;
  }
}

function renderTickets() {
  const rows =
    ticketsCache || [];

  document.getElementById(
    "ticketsCount"
  ).textContent =
    rows.length;

  document.getElementById(
    "ticketsList"
  ).innerHTML = rows.length
    ? rows
        .map((t) => {
          const status =
            t.status ===
            "approved"
              ? "Одобрено"
              : t.status ===
                "rejected"
              ? "Отклонено"
              : "На рассмотрении";

          const cls =
            t.status ===
            "approved"
              ? "status-approved"
              : t.status ===
                "rejected"
              ? "status-rejected"
              : "status-pending";

          const admin =
            currentUser.role ===
            "admin"
              ? `
                <div class="admin-ticket-edit">

                  <div class="field">
                    <label>
                      Статус
                    </label>

                    <select
                      data-ticket-status="${escapeHtml(
                        t.id
                      )}"
                    >
                      <option
                        value="pending"
                        ${
                          t.status ===
                          "pending"
                            ? "selected"
                            : ""
                        }
                      >
                        На рассмотрении
                      </option>

                      <option
                        value="approved"
                        ${
                          t.status ===
                          "approved"
                            ? "selected"
                            : ""
                        }
                      >
                        Одобрено
                      </option>

                      <option
                        value="rejected"
                        ${
                          t.status ===
                          "rejected"
                            ? "selected"
                            : ""
                        }
                      >
                        Отклонено
                      </option>
                    </select>
                  </div>

                  <div class="field">
                    <label>
                      Ответ
                    </label>

                    <textarea
                      data-ticket-response="${escapeHtml(
                        t.id
                      )}"
                      rows="3"
                      maxlength="4000"
                    >${escapeHtml(
                      t.adminResponse ||
                        ""
                    )}</textarea>
                  </div>

                  <button
                    class="btn btn-primary btn-small"
                    data-ticket-save="${escapeHtml(
                      t.id
                    )}"
                  >
                    Сохранить ответ
                  </button>

                  <button
                    class="btn btn-ghost btn-small"
                    data-ticket-delete="${escapeHtml(
                      t.id
                    )}"
                  >
                    Удалить
                  </button>

                </div>
              `
              : "";

          return `
            <div class="ticket-item">

              <div class="ticket-top">

                <div>
                  <div class="ticket-title">
                    ${escapeHtml(
                      t.title
                    )}
                  </div>

                  <div class="ticket-meta">
                    ${
                      t.type ===
                      "bug"
                        ? "Баг"
                        : "Предложение"
                    }

                    ·

                    ${escapeHtml(
                      formatDate(
                        t.date || ""
                      )
                    )}

                    ${
                      currentUser.role ===
                      "admin"
                        ? ` · ${escapeHtml(
                            t.authorEmail ||
                              ""
                          )}`
                        : ""
                    }
                  </div>
                </div>

                <span
                  class="ticket-status ${cls}"
                >
                  ${status}
                </span>

              </div>

              <div class="ticket-description">
                ${escapeHtml(
                  t.description
                )}
              </div>

              ${
                t.adminResponse
                  ? `
                    <div class="admin-response">
                      <b>
                        Ответ администратора
                      </b>

                      <div class="ticket-response">
                        ${escapeHtml(
                          t.adminResponse
                        )}
                      </div>
                    </div>
                  `
                  : ""
              }

              ${admin}

            </div>
          `;
        })
        .join("")
    : `
      <div class="empty-state">
        Заявок пока нет.
      </div>
    `;
}

async function updateTicket(
  id
) {
  if (
    currentUser?.role !==
    "admin"
  ) {
    return;
  }

  const status =
    document.querySelector(
      `[data-ticket-status="${CSS.escape(
        id
      )}"]`
    )?.value ||
    "pending";

  const response =
    document
      .querySelector(
        `[data-ticket-response="${CSS.escape(
          id
        )}"]`
      )
      ?.value.trim() ||
    "";

  try {
    await db
      .collection(
        "supportTickets"
      )
      .doc(id)
      .update({
        status,
        adminResponse: response,
        updatedAt:
          firebase.firestore.FieldValue.serverTimestamp()
      });

    ticketsCache = null;

    toast(
      "Ответ по заявке сохранён"
    );

    loadTickets(true);
  } catch (err) {
    toast(
      "Не удалось сохранить ответ",
      "error"
    );
  }
}

async function createTicket() {
  if (
    currentUser?.role ===
    "public"
  ) {
    return showLoginHint();
  }

  const title =
    document
      .getElementById(
        "ticketTitle"
      )
      .value.trim();

  const description =
    document
      .getElementById(
        "ticketDescription"
      )
      .value.trim();

  const type =
    document.getElementById(
      "ticketType"
    ).value;

  if (!title || !description) {
    return toast(
      "Заполните заголовок и описание",
      "error"
    );
  }

  try {
    await db
      .collection(
        "supportTickets"
      )
      .add({
        type,
        title,
        description,
        authorEmail:
          currentUser.email,
        authorName:
          currentUser.displayName ||
          currentUser.email,
        date: todayISO(),
        status:
          "pending",
        adminResponse: "",
        createdAt:
          firebase.firestore.FieldValue.serverTimestamp()
      });

    document.getElementById(
      "ticketTitle"
    ).value = "";

    document.getElementById(
      "ticketDescription"
    ).value = "";

    ticketsCache = null;

    toast(
      "Заявка отправлена"
    );

    loadTickets(true);
  } catch (err) {
    toast(
      "Не удалось отправить заявку",
      "error"
    );
  }
}

async function deleteTicket(
  id
) {
  if (
    currentUser?.role !==
    "admin"
  ) {
    return;
  }

  const ok =
    await confirmDialog({
      title:
        "Удалить заявку?",
      text:
        "Заявка будет удалена.",
      okText: "Удалить"
    });

  if (!ok) {
    return;
  }

  try {
    await db
      .collection(
        "supportTickets"
      )
      .doc(id)
      .delete();

    ticketsCache = null;

    toast(
      "Заявка удалена"
    );

    loadTickets(true);
  } catch (err) {
    toast(
      "Не удалось удалить заявку",
      "error"
    );
  }
}

function loadProfileToUI() {
  if (
    currentUser?.role ===
    "public"
  ) {
    return;
  }

  const d = {
    ...currentUser,
    ...profileData
  };

  document.getElementById(
    "profileName"
  ).value =
    d.displayName || "";

  document.getElementById(
    "profileEmail"
  ).textContent =
    d.email || "";

  document.getElementById(
    "profileDisplayName"
  ).textContent =
    d.displayName ||
    d.email ||
    "Пользователь";

  const img =
    document.getElementById(
      "profileAvatarPreview"
    );

  const fallback =
    document.getElementById(
      "profileAvatarFallback"
    );

  if (d.avatarUrl) {
    img.src = d.avatarUrl;
    img.style.display =
      "block";

    fallback.style.display =
      "none";
  } else {
    img.style.display =
      "none";

    fallback.style.display =
      "flex";

    fallback.textContent =
      initials(
        d.displayName,
        d.email
      );
  }
}

async function saveProfile() {
  if (
    currentUser?.role ===
    "public"
  ) {
    return;
  }

  const name =
    document
      .getElementById(
        "profileName"
      )
      .value.trim();

  const file =
    document.getElementById(
      "avatarFile"
    ).files[0];

  let avatarUrl =
    currentUser.avatarUrl ||
    "";

  try {
    if (file) {
      if (
        file.size >
        3 * 1024 * 1024
      ) {
        return toast(
          "Аватар должен быть меньше 3 МБ",
          "error"
        );
      }

      if (
        !/^image\/(png|jpeg|webp)$/.test(
          file.type
        )
      ) {
        return toast(
          "Используйте PNG, JPG или WebP",
          "error"
        );
      }

      const ref =
        storage.ref(
          `avatars/${encodeURIComponent(
            currentUser.email
          )}`
        );

      const snap =
        await ref.put(
          file,
          {
            contentType:
              file.type,
            cacheControl:
              "public,max-age=3600"
          }
        );

      avatarUrl =
        await snap.ref.getDownloadURL();
    }

    await db
      .collection("users")
      .doc(
        currentUser.email
      )
      .set(
        {
          faction:
            currentUser.faction ||
            null,
          displayName: name,
          avatarUrl,
          updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
        },
        {
          merge: true
        }
      );

    currentUser.displayName =
      name ||
      currentUser.displayName;

    currentUser.avatarUrl =
      avatarUrl;

    profileData = {
      ...profileData,
      displayName:
        currentUser.displayName,
      avatarUrl
    };

    renderHeader();
    loadProfileToUI();

    toast(
      "Профиль сохранён"
    );
  } catch (err) {
    console.error(err);

    toast(
      "Не удалось сохранить профиль: " +
        (err.message ||
          "нет прав"),
      "error"
    );
  }
}

async function resetProfile() {
  if (
    currentUser?.role ===
    "public"
  ) {
    return;
  }

  const u =
    auth.currentUser;

  if (!u) {
    return;
  }

  try {
    const n =
      u.displayName || "";

    const a =
      u.photoURL || "";

    await db
      .collection("users")
      .doc(
        currentUser.email
      )
      .set(
        {
          displayName: n,
          avatarUrl: a,
          updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
        },
        {
          merge: true
        }
      );

    currentUser.displayName =
      n;

    currentUser.avatarUrl =
      a;

    profileData = {
      ...profileData,
      displayName: n,
      avatarUrl: a
    };

    renderHeader();
    loadProfileToUI();

    toast(
      "Профиль сброшен к данным Google"
    );
  } catch (err) {
    toast(
      "Не удалось сбросить профиль",
      "error"
    );
  }
}
