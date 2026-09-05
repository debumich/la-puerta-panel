const ADMIN_TABS = ["manager", "settings"];

function switchTab(tab) {
  const publicTabs = ["home", "leaders"];

  if (currentUser?.role === "public" && !publicTabs.includes(tab)) {
    return showLoginHint();
  }

  if (ADMIN_TABS.includes(tab) && currentUser?.role !== "admin") {
    return toast("Раздел доступен только администратору", "error");
  }

  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.toggle("active", p.id === `panel-${tab}`);
  });

  setActiveTab(tab);

  if (tab === "reports") {
    initReportForm();
    renderReports();
  }

  if (tab === "history") {
    initHistory();
    renderHistory();
  }

  if (tab === "manager") {
    fillManagerFactionSelect();
    loadLeadersList();
  }

  if (tab === "settings") {
    renderFactionToggles();
    renderMyFactionsChips();
  }

  if (tab === "support") {
    loadTickets();
  }

  if (tab === "profile") {
    loadProfileToUI();
  }
}

function showLoginHint() {
  toast("Войдите через Google, чтобы открыть этот раздел");
}

function bindEvents() {
  document
    .getElementById("googleLoginBtn")
    .addEventListener("click", login);

  document
    .getElementById("header-root")
    .addEventListener("click", (e) => {
      const el = e.target.closest("[data-tab]");
      if (el) {
        switchTab(el.dataset.tab);
      }
    });

  document
    .getElementById("leaderSearch")
    .addEventListener(
      "input",
      debounce((e) => {
        ui.search = e.target.value;
        renderLeaders();
      }, 120)
    );

  document
    .getElementById("statsRow")
    .addEventListener("click", (e) => {
      const c = e.target.closest(".stat-chip");
      if (!c) return;

      const s = c.dataset.status || null;
      ui.statusFilter = ui.statusFilter === s ? null : s;

      renderLeaders();
    });

  document
    .getElementById("refreshBtn")
    .addEventListener("click", () => fetchLeaders(true));

  document
    .getElementById("leadersRoot")
    .addEventListener("click", (e) => {
      if (e.target.closest('[data-action="retry-leaders"]')) {
        fetchLeaders(true);
      }
    });

  document
    .getElementById("reportFaction")
    .addEventListener("change", updateLeaderName);

  document
    .getElementById("saveReportBtn")
    .addEventListener("click", saveReport);

  document
    .getElementById("reportsList")
    .addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit-comment]");
      const save = e.target.closest("[data-save-comment]");
      const cancel = e.target.closest("[data-cancel-edit]");
      const del = e.target.closest("[data-report-delete]");

      if (edit) {
        editReportComment(edit.dataset.editComment);
      }

      if (save) {
        saveReportComment(save.dataset.saveComment);
      }

      if (cancel) {
        renderReports();
      }

      if (del) {
        deleteReport(del.dataset.reportDelete);
      }
    });

  ["reportFactionFilter", "reportFilterStart", "reportFilterEnd"].forEach(
    (id) => {
      document.getElementById(id).addEventListener("change", (e) => {
        if (id === "reportFactionFilter") {
          ui.reportFactionFilter = e.target.value;
        }

        if (id === "reportFilterStart") {
          ui.historyStart = e.target.value;
        }

        if (id === "reportFilterEnd") {
          ui.historyEnd = e.target.value;
        }

        renderReports();
      });
    }
  );

  document
    .getElementById("reportFilterReset")
    .addEventListener("click", () => {
      ui.reportFactionFilter = "";
      ui.historyStart = "";
      ui.historyEnd = "";

      ["reportFactionFilter", "reportFilterStart", "reportFilterEnd"].forEach(
        (id) => {
          document.getElementById(id).value = "";
        }
      );

      renderReports();
    });

  document
    .getElementById("addLeaderBtn")
    .addEventListener("click", addLeader);

  document
    .getElementById("managerSearch")
    .addEventListener(
      "input",
      debounce((e) => {
        ui.managerSearch = e.target.value;
        loadLeadersList();
      }, 120)
    );

  document
    .getElementById("leadersListRoot")
    .addEventListener("click", (e) => {
      const b = e.target.closest("[data-remove-leader]");
      if (b) {
        removeLeader(b.dataset.removeLeader);
      }
    });

  document
    .getElementById("selectAllBtn")
    .addEventListener("click", selectAllFactions);

  document
    .getElementById("deselectAllBtn")
    .addEventListener("click", deselectAllFactions);

  document
    .getElementById("settingsCategories")
    .addEventListener("click", (e) => {
      const el = e.target.closest(".faction-toggle-item");
      if (!el) return;

      if (el.dataset.gov) {
        toggleGov();
      } else {
        toggleFactionSingle(el.dataset.key);
      }
    });

  document
    .getElementById("myFactionsChips")
    .addEventListener("click", (e) => {
      const el = e.target.closest(".remove");
      if (el) {
        toggleFactionSingle(el.dataset.removeKey);
      }
    });

  document
    .getElementById("saveHistoryBtn")
    .addEventListener("click", saveHistory);

  ["historyFactionFilter", "historyStart", "historyEnd"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      ui.historyFactionFilter =
        document.getElementById("historyFactionFilter").value;

      ui.historyStart =
        document.getElementById("historyStart").value;

      ui.historyEnd =
        document.getElementById("historyEnd").value;

      renderHistory();
    });
  });

  document
    .getElementById("historyReset")
    .addEventListener("click", () => {
      ui.historyFactionFilter = "";
      ui.historyStart = "";
      ui.historyEnd = "";

      ["historyFactionFilter", "historyStart", "historyEnd"].forEach(
        (id) => {
          document.getElementById(id).value = "";
        }
      );

      renderHistory();
    });

  document
    .getElementById("historyList")
    .addEventListener("click", (e) => {
      const b = e.target.closest("[data-history-delete]");

      if (b) {
        deleteHistory(b.dataset.historyDelete);
      }
    });

  document
    .getElementById("createTicketBtn")
    .addEventListener("click", createTicket);

  document
    .getElementById("ticketsList")
    .addEventListener("click", (e) => {
      const save = e.target.closest("[data-ticket-save]");
      const del = e.target.closest("[data-ticket-delete]");

      if (save) {
        updateTicket(save.dataset.ticketSave);
      }

      if (del) {
        deleteTicket(del.dataset.ticketDelete);
      }
    });

  document
    .getElementById("saveProfileBtn")
    .addEventListener("click", saveProfile);

  document
    .getElementById("resetProfileBtn")
    .addEventListener("click", resetProfile);

  document
    .getElementById("confirmOk")
    .addEventListener("click", () => closeConfirm(true));

  document
    .getElementById("confirmCancel")
    .addEventListener("click", () => closeConfirm(false));

  document
    .getElementById("confirmOverlay")
    .addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        closeConfirm(false);
      }
    });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeConfirm(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initAuth();
});
