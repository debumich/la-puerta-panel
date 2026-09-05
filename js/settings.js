function getMyFactions() {
  try {
    return JSON.parse(
      localStorage.getItem(
        "myFactions"
      ) || "[]"
    );
  } catch (e) {
    return [];
  }
}

function setMyFactions(arr) {
  localStorage.setItem(
    "myFactions",
    JSON.stringify(arr)
  );

  renderFactionToggles();
  renderMyFactionsChips();
  renderLeaders();
  renderReports();
}

function toggleFactionSingle(key) {
  const a =
    getMyFactions();

  const i =
    a.indexOf(key);

  if (i >= 0) {
    a.splice(i, 1);
  } else {
    a.push(key);
  }

  setMyFactions(a);
}

function selectAllFactions() {
  if (leaderData) {
    setMyFactions(
      Object.keys(
        leaderData
      )
    );
  }
}

function deselectAllFactions() {
  setMyFactions([]);
}

function toggleGov() {
  const a =
    getMyFactions();

  const all =
    GOV_KEYS.every(
      (k) => a.includes(k)
    );

  setMyFactions(
    all
      ? a.filter(
          (k) =>
            !GOV_KEYS.includes(k)
        )
      : Array.from(
          new Set([
            ...a,
            ...GOV_KEYS
          ])
        )
  );
}

function removeGov() {
  setMyFactions(
    getMyFactions().filter(
      (k) =>
        !GOV_KEYS.includes(k)
    )
  );
}

function renderFactionToggles() {
  const c =
    document.getElementById(
      "settingsCategories"
    );

  if (!c || !leaderData) {
    return;
  }

  const current =
    getMyFactions();

  c.innerHTML =
    CATEGORY_ORDER.map(
      (cat) => {
        const keys =
          Object.keys(
            leaderData
          ).filter(
            (k) =>
              (leaderData[k]
                .category ||
                "other") ===
                cat &&
              !GOV_KEYS.includes(
                k
              )
          );

        if (cat === "gov") {
          keys.unshift(
            "__GOV__"
          );
        }

        if (!keys.length) {
          return "";
        }

        return `
          <div class="settings-category">

            <div class="cat-title">
              ${escapeHtml(
                CATEGORY_NAMES[cat]
              )}
            </div>

            <div class="faction-toggle-grid">

              ${keys
                .map((k) => {
                  if (
                    k ===
                    "__GOV__"
                  ) {
                    const active =
                      GOV_KEYS.every(
                        (x) =>
                          current.includes(
                            x
                          )
                      );

                    return `
                      <div
                        class="faction-toggle-item ${
                          active
                            ? "active"
                            : ""
                        }"
                        data-gov="1"
                      >
                        <span class="indicator"></span>
                        <span>GOV</span>
                      </div>
                    `;
                  }

                  const active =
                    current.includes(
                      k
                    );

                  return `
                    <div
                      class="faction-toggle-item ${
                        active
                          ? "active"
                          : ""
                      }"
                      data-key="${escapeHtml(
                        k
                      )}"
                      title="${escapeHtml(
                        k
                      )}"
                    >
                      <span class="indicator"></span>
                      <span class="label-text">
                        ${escapeHtml(
                          k
                        )}
                      </span>
                    </div>
                  `;
                })
                .join("")}

            </div>

          </div>
        `;
      }
    ).join("");
}

function renderMyFactionsChips() {
  const c =
    document.getElementById(
      "myFactionsChips"
    );

  if (!c) {
    return;
  }

  const a =
    getMyFactions();

  c.innerHTML = a.length
    ? a
        .map(
          (k) => `
            <span class="chip">
              ${escapeHtml(k)}
              <span
                class="remove"
                data-remove-key="${escapeHtml(
                  k
                )}"
              >
                ×
              </span>
            </span>
          `
        )
        .join("")
    : `
      <span class="empty-chips">
        Не выбрано ни одной фракции —
        показывается всё.
      </span>
    `;
}
