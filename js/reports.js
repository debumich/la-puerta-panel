let reportsCache = null;

async function loadReports(force = false) {
  if (reportsCache && !force) {
    return reportsCache;
  }

  if (
    !currentUser ||
    currentUser.role === "public"
  ) {
    return [];
  }

  try {
    let q = db.collection("reports");

    if (currentUser.role === "leader") {
      q = q.where(
        "faction",
        "==",
        currentUser.faction
      );
    }

    const snap = await q.get();

    let arr = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    arr.sort(
      (a, b) =>
        (b.timestamp?.seconds || 0) -
        (a.timestamp?.seconds || 0)
    );

    reportsCache = arr;

    return arr;
  } catch (err) {
    console.error(err);

    toast(
      "Не удалось загрузить отчёты",
      "error"
    );

    return reportsCache || [];
  }
}

async function refreshReports() {
  reportsCache = null;

  await loadReports(true);
  renderReports();
}

function canEditComment(r) {
  return (
    currentUser?.role === "leader" &&
    r.authorEmail === currentUser.email &&
    r.faction === currentUser.faction &&
    isCurrentLeaderActive()
  );
}

function renderReports() {
  if (
    !currentUser ||
    currentUser.role === "public"
  ) {
    return;
  }

  const list =
    document.getElementById(
      "reportsList"
    );

  loadReports().then((reports) => {
    if (currentUser.role === "admin") {
      const f =
        ui.reportFactionFilter;

      const start =
        ui.historyStart || "";

      const end =
        ui.historyEnd || "";

      reports = reports.filter(
        (r) =>
          (!f || r.faction === f) &&
          (!start ||
            r.date >= start) &&
          (!end || r.date <= end)
      );
    }

    document.getElementById(
      "reportsCount"
    ).textContent = reports.length;

    if (!reports.length) {
      list.innerHTML = `
        <div class="empty-state">
          Отчётов пока нет.
        </div>
      `;

      return;
    }

    list.innerHTML = reports
      .map((r) => {
        const edit =
          canEditComment(r);

        return `
          <div
            class="report-item"
            data-report-id="${escapeHtml(
              r.id
            )}"
          >

            <div class="r-top">

              <div>
                <div class="r-name">
                  ${escapeHtml(
                    r.name
                  )} — ${escapeHtml(
                    r.faction
                  )}
                </div>

                <div class="r-meta">
                  ${escapeHtml(
                    formatDate(
                      r.date
                    )
                  )}

                  ${
                    r.authorEmail
                      ? ` · ${escapeHtml(
                          r.authorEmail
                        )}`
                      : ""
                  }
                </div>
              </div>

              ${
                currentUser.role ===
                "admin"
                  ? `
                    <button
                      class="r-delete"
                      data-report-delete="${escapeHtml(
                        r.id
                      )}"
                    >
                      Удалить
                    </button>
                  `
                  : ""
              }

            </div>

            ${
              r.problems
                ? `
                  <div class="r-field">
                    <b>Проблемы:</b>
                    ${escapeHtml(
                      r.problems
                    )}
                  </div>
                `
                : ""
            }

            ${
              r.improvements
                ? `
                  <div class="r-field">
                    <b>Улучшения:</b>
                    ${escapeHtml(
                      r.improvements
                    )}
                  </div>
                `
                : ""
            }

            <div class="r-field">
              <b>Комментарий:</b>
              <span class="comment-text">
                ${escapeHtml(
                  r.comment ||
                    "Не указано"
                )}
              </span>
            </div>

            ${
              edit
                ? `
                  <div class="report-actions">
                    <button
                      class="btn btn-ghost btn-small"
                      data-edit-comment="${escapeHtml(
                        r.id
                      )}"
                    >
                      Изменить комментарий
                    </button>
                  </div>
                `
                : ""
            }

          </div>
        `;
      })
      .join("");
  });
}

function initReportForm() {
  if (
    !currentUser ||
    currentUser.role === "public"
  ) {
    return;
  }

  const form =
    document.getElementById(
      "reportForm"
    );

  const select =
    document.getElementById(
      "reportFaction"
    );

  const title =
    document.getElementById(
      "reportFormTitle"
    );

  const save =
    document.getElementById(
      "saveReportBtn"
    );

  if (!form || !select) {
    return;
  }

  if (currentUser.role === "admin") {
    form.hidden = true;

    if (save) {
      save.hidden = true;
    }

    return;
  }

  form.hidden = false;

  if (save) {
    save.hidden = false;
  }

  title.textContent =
    `Новый отчёт — ${currentUser.faction}`;

  select.innerHTML = `
    <option value="${escapeHtml(
      currentUser.faction
    )}">
      ${escapeHtml(
        currentUser.faction
      )}
    </option>
  `;

  select.disabled = true;

  updateLeaderName();
}

function updateLeaderName() {
  if (
    !currentUser ||
    currentUser.role !== "leader"
  ) {
    return;
  }

  const input =
    document.getElementById(
      "reportName"
    );

  if (!input) {
    return;
  }

  const nickname =
    leaderData?.[
      currentUser.faction
    ]?.nickname;

  input.value =
    nickname &&
    nickname !== "-"
      ? nickname
      : "";
}

async function saveReport() {
  if (
    !currentUser ||
    currentUser.role !== "leader"
  ) {
    return toast(
      "Администратор не создаёт отчёты",
      "error"
    );
  }

  const btn =
    document.getElementById(
      "saveReportBtn"
    );

  const faction =
    currentUser.faction;

  const name =
    document
      .getElementById("reportName")
      .value.trim();

  const date =
    document
      .getElementById("reportDate")
      .value;

  const problems =
    document
      .getElementById(
        "reportProblems"
      )
      .value.trim();

  const improvements =
    document
      .getElementById(
        "reportImprovements"
      )
      .value.trim();

  const comment =
    document
      .getElementById(
        "reportComment"
      )
      .value.trim();

  if (!faction || !name || !date) {
    return toast(
      "Заполните имя лидера и дату",
      "error"
    );
  }

  btn.classList.add("loading");

  try {
    await db.collection("reports").add({
      faction,
      name,
      date,
      problems,
      improvements,
      comment,
      side: "all",
      authorEmail:
        currentUser.email,
      timestamp:
        firebase.firestore.FieldValue.serverTimestamp()
    });

    [
      "reportProblems",
      "reportImprovements",
      "reportComment"
    ].forEach((id) => {
      document.getElementById(
        id
      ).value = "";
    });

    toast("Отчёт сохранён");

    await refreshReports();
  } catch (err) {
    console.error(err);

    toast(
      "Не удалось сохранить отчёт: " +
        (err.message ||
          "нет прав"),
      "error"
    );
  } finally {
    btn.classList.remove("loading");
  }
}

function editReportComment(id) {
  const r = (
    reportsCache || []
  ).find((x) => x.id === id);

  if (!canEditComment(r)) {
    return toast(
      "Редактирование больше недоступно",
      "error"
    );
  }

  const el =
    document.querySelector(
      `[data-report-id="${CSS.escape(
        id
      )}"]`
    );

  if (!el) {
    return;
  }

  const current =
    r.comment || "";

  const currentText =
    el.querySelector(
      ".comment-text"
    );

  if (currentText) {
    currentText.outerHTML = `
      <textarea
        class="report-comment-editor"
        maxlength="4000"
        rows="4"
      >${escapeHtml(
        current
      )}</textarea>
    `;
  }

  const oldActions =
    el.querySelector(
      ".report-actions"
    );

  if (oldActions) {
    oldActions.remove();
  }

  const actions =
    document.createElement("div");

  actions.className =
    "report-actions";

  actions.innerHTML = `
    <button
      class="btn btn-primary"
      data-save-comment="${escapeHtml(
        id
      )}"
    >
      Сохранить
    </button>

    <button
      class="btn btn-ghost"
      data-cancel-edit
    >
      Отмена
    </button>
  `;

  el.appendChild(actions);
}

async function saveReportComment(id) {
  const r = (
    reportsCache || []
  ).find((x) => x.id === id);

  if (!canEditComment(r)) {
    return toast(
      "Редактирование больше недоступно",
      "error"
    );
  }

  const el =
    document.querySelector(
      `[data-report-id="${CSS.escape(
        id
      )}"]`
    );

  if (!el) {
    return;
  }

  const text =
    el
      .querySelector(
        "textarea"
      )
      ?.value.trim() || "";

  try {
    await db
      .collection("reports")
      .doc(id)
      .update({
        comment: text,
        updatedAt:
          firebase.firestore.FieldValue.serverTimestamp()
      });

    toast(
      "Комментарий обновлён"
    );

    await refreshReports();
  } catch (err) {
    console.error(err);

    toast(
      "Не удалось изменить комментарий",
      "error"
    );
  }
}

async function deleteReport(id) {
  if (
    currentUser?.role !==
    "admin"
  ) {
    return;
  }

  const ok =
    await confirmDialog({
      title: "Удалить отчёт?",
      text:
        "Отчёт будет удалён безвозвратно.",
      okText: "Удалить"
    });

  if (!ok) {
    return;
  }

  try {
    await db
      .collection("reports")
      .doc(id)
      .delete();

    toast("Отчёт удалён");

    await refreshReports();
  } catch (err) {
    console.error(err);

    toast(
      "Не удалось удалить отчёт",
      "error"
    );
  }
}
