const ADMIN_TABS = ["manager", "settings"];

function switchTab(tab) {
  const publicTabs = ["leaders"];

  if (
    currentUser?.role === "public" &&
    !publicTabs.includes(tab)
  ) {
    if (tab === "reports" || tab === "support" || tab === "profile" || tab === "history") {
      showLoginHint();
    }

    return;
  }

  if (
    ADMIN_TABS.includes(tab) &&
    currentUser?.role !== "admin"
  ) {
    toast(
      "Раздел доступен только администратору",
      "error"
    );

    return;
  }

  const panel = document.getElementById(
    `panel-${tab}`
  );

  if (!panel) {
    console.warn(
      `Панель panel-${tab} не найдена`
    );

    return;
  }

  document
    .querySelectorAll(".panel")
    .forEach((p) => {
      p.classList.toggle(
        "active",
        p.id === `panel-${tab}`
      );
    });

  setActiveTab(tab);

  if (tab === "home") {
    return;
  }

  if (tab === "leaders") {
    renderLeaders();
    return;
  }

  if (tab === "reports") {
    initReportForm();
    renderReports();
    return;
  }

  if (tab === "history") {
    initHistory();
    renderHistory();
    return;
  }

  if (tab === "manager") {
    fillManagerFactionSelect();
    loadLeadersList();
    return;
  }

  if (tab === "settings") {
    renderFactionToggles();
    renderMyFactionsChips();
    return;
  }

  if (tab === "support") {
    loadTickets();
    return;
  }

  if (tab === "profile") {
    loadProfileToUI();
  }
}

function showLoginHint() {
  toast(
    "Войдите через Google, чтобы открыть этот раздел"
  );
}

function bindEvents() {
  const googleLoginBtn =
    document.getElementById(
      "googleLoginBtn"
    );

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener(
      "click",
      login
    );
  }

  const headerRoot =
    document.getElementById(
      "header-root"
    );

  if (headerRoot) {
    headerRoot.addEventListener(
      "click",
      (e) => {
        const el =
          e.target.closest(
            "[data-tab]"
          );

        if (!el) {
          return;
        }

        e.preventDefault();

        switchTab(
          el.dataset.tab
        );
      }
    );
  }

  document.addEventListener(
    "click",
    (e) => {
      const el =
        e.target.closest(
          "[data-tab]"
        );

      if (!el) {
        return;
      }

      if (
        headerRoot &&
        headerRoot.contains(el)
      ) {
        return;
      }

      e.preventDefault();

      const tab =
        el.dataset.tab;

      if (
        el.dataset.authOnly ===
        "true" &&
        currentUser?.role ===
          "public"
      ) {
        showLoginHint();
        return;
      }

      switchTab(tab);
    }
  );

  const leaderSearch =
    document.getElementById(
      "leaderSearch"
    );

  if (leaderSearch) {
    leaderSearch.addEventListener(
      "input",
      debounce((e) => {
        ui.search =
          e.target.value;

        renderLeaders();
      }, 120)
    );
  }

  const statsRow =
    document.getElementById(
      "statsRow"
    );

  if (statsRow) {
    statsRow.addEventListener(
      "click",
      (e) => {
        const c =
          e.target.closest(
            ".stat-chip"
          );

        if (!c) {
          return;
        }

        const s =
          c.dataset.status ||
          null;

        ui.statusFilter =
          ui.statusFilter === s
            ? null
            : s;

        renderLeaders();
      }
    );
  }

  const refreshBtn =
    document.getElementById(
      "refreshBtn"
    );

  if (refreshBtn) {
    refreshBtn.addEventListener(
      "click",
      () => fetchLeaders(true)
    );
  }

  const leadersRoot =
    document.getElementById(
      "leadersRoot"
    );

  if (leadersRoot) {
    leadersRoot.addEventListener(
      "click",
      (e) => {
        if (
          e.target.closest(
            '[data-action="retry-leaders"]'
          )
        ) {
          fetchLeaders(true);
        }
      }
    );
  }

  const reportFaction =
    document.getElementById(
      "reportFaction"
    );

  if (reportFaction) {
    reportFaction.addEventListener(
      "change",
      updateLeaderName
    );
  }

  const saveReportBtn =
    document.getElementById(
      "saveReportBtn"
    );

  if (saveReportBtn) {
    saveReportBtn.addEventListener(
      "click",
      saveReport
    );
  }

  const reportsList =
    document.getElementById(
      "reportsList"
    );

  if (reportsList) {
    reportsList.addEventListener(
      "click",
      (e) => {
        const edit =
          e.target.closest(
            "[data-edit-comment]"
          );

        const save =
          e.target.closest(
            "[data-save-comment]"
          );

        const cancel =
          e.target.closest(
            "[data-cancel-edit]"
          );

        const del =
          e.target.closest(
            "[data-report-delete]"
          );

        if (edit) {
          editReportComment(
            edit.dataset.editComment
          );
        }

        if (save) {
          saveReportComment(
            save.dataset.saveComment
          );
        }

        if (cancel) {
          renderReports();
        }

        if (del) {
          deleteReport(
            del.dataset.reportDelete
          );
        }
      }
    );
  }

  const reportFactionFilter =
    document.getElementById(
      "reportFactionFilter"
    );

  if (reportFactionFilter) {
    reportFactionFilter.addEventListener(
      "change",
      (e) => {
        ui.reportFactionFilter =
          e.target.value;

        renderReports();
      }
    );
  }

  const reportFilterStart =
    document.getElementById(
      "reportFilterStart"
    );

  if (reportFilterStart) {
    reportFilterStart.addEventListener(
      "change",
      (e) => {
        ui.historyStart =
          e.target.value;

        renderReports();
      }
    );
  }

  const reportFilterEnd =
    document.getElementById(
      "reportFilterEnd"
    );

  if (reportFilterEnd) {
    reportFilterEnd.addEventListener(
      "change",
      (e) => {
        ui.historyEnd =
          e.target.value;

        renderReports();
      }
    );
  }

  const reportFilterReset =
    document.getElementById(
      "reportFilterReset"
    );

  if (reportFilterReset) {
    reportFilterReset.addEventListener(
      "click",
      () => {
        ui.reportFactionFilter =
          "";

        ui.historyStart =
          "";

        ui.historyEnd =
          "";

        if (reportFactionFilter) {
          reportFactionFilter.value =
            "";
        }

        if (reportFilterStart) {
          reportFilterStart.value =
            "";
        }

        if (reportFilterEnd) {
          reportFilterEnd.value =
            "";
        }

        renderReports();
      }
    );
  }

  const addLeaderBtn =
    document.getElementById(
      "addLeaderBtn"
    );

  if (addLeaderBtn) {
    addLeaderBtn.addEventListener(
      "click",
      addLeader
    );
  }

  const newLeaderEmail =
    document.getElementById(
      "newLeaderEmail"
    );

  if (newLeaderEmail) {
    newLeaderEmail.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter") {
          addLeader();
        }
      }
    );
  }

  const managerSearch =
    document.getElementById(
      "managerSearch"
    );

  if (managerSearch) {
    managerSearch.addEventListener(
      "input",
      debounce((e) => {
        ui.managerSearch =
          e.target.value;

        loadLeadersList();
      }, 120)
    );
  }

  const leadersListRoot =
    document.getElementById(
      "leadersListRoot"
    );

  if (leadersListRoot) {
    leadersListRoot.addEventListener(
      "click",
      (e) => {
        const b =
          e.target.closest(
            "[data-remove-leader]"
          );

        if (b) {
          removeLeader(
            b.dataset.removeLeader
          );
        }
      }
    );
  }

  const selectAllBtn =
    document.getElementById(
      "selectAllBtn"
    );

  if (selectAllBtn) {
    selectAllBtn.addEventListener(
      "click",
      selectAllFactions
    );
  }

  const deselectAllBtn =
    document.getElementById(
      "deselectAllBtn"
    );

  if (deselectAllBtn) {
    deselectAllBtn.addEventListener(
      "click",
      deselectAllFactions
    );
  }

  const settingsCategories =
    document.getElementById(
      "settingsCategories"
    );

  if (settingsCategories) {
    settingsCategories.addEventListener(
      "click",
      (e) => {
        const el =
          e.target.closest(
            ".faction-toggle-item"
          );

        if (!el) {
          return;
        }

        if (el.dataset.gov) {
          toggleGov();
        } else {
          toggleFactionSingle(
            el.dataset.key
          );
        }
      }
    );
  }

  const myFactionsChips =
    document.getElementById(
      "myFactionsChips"
    );

  if (myFactionsChips) {
    myFactionsChips.addEventListener(
      "click",
      (e) => {
        const el =
          e.target.closest(
            ".remove"
          );

        if (!el) {
          return;
        }

        toggleFactionSingle(
          el.dataset.removeKey
        );
      }
    );
  }

  const saveHistoryBtn =
    document.getElementById(
      "saveHistoryBtn"
    );

  if (saveHistoryBtn) {
    saveHistoryBtn.addEventListener(
      "click",
      saveHistory
    );
  }

  const historyFactionFilter =
    document.getElementById(
      "historyFactionFilter"
    );

  if (historyFactionFilter) {
    historyFactionFilter.addEventListener(
      "change",
      (e) => {
        ui.historyFactionFilter =
          e.target.value;

        renderHistory();
      }
    );
  }

  const historyStart =
    document.getElementById(
      "historyStart"
    );

  if (historyStart) {
    historyStart.addEventListener(
      "change",
      (e) => {
        ui.historyStart =
          e.target.value;

        renderHistory();
      }
    );
  }

  const historyEnd =
    document.getElementById(
      "historyEnd"
    );

  if (historyEnd) {
    historyEnd.addEventListener(
      "change",
      (e) => {
        ui.historyEnd =
          e.target.value;

        renderHistory();
      }
    );
  }

  const historyReset =
    document.getElementById(
      "historyReset"
    );

  if (historyReset) {
    historyReset.addEventListener(
      "click",
      () => {
        ui.historyFactionFilter =
          "";

        ui.historyStart =
          "";

        ui.historyEnd =
          "";

        if (historyFactionFilter) {
          historyFactionFilter.value =
            "";
        }

        if (historyStart) {
          historyStart.value =
            "";
        }

        if (historyEnd) {
          historyEnd.value =
            "";
        }

        renderHistory();
      }
    );
  }

  const historyList =
    document.getElementById(
      "historyList"
    );

  if (historyList) {
    historyList.addEventListener(
      "click",
      (e) => {
        const b =
          e.target.closest(
            "[data-history-delete]"
          );

        if (b) {
          deleteHistory(
            b.dataset.historyDelete
          );
        }
      }
    );
  }

  const createTicketBtn =
    document.getElementById(
      "createTicketBtn"
    );

  if (createTicketBtn) {
    createTicketBtn.addEventListener(
      "click",
      createTicket
    );
  }

  const ticketsList =
    document.getElementById(
      "ticketsList"
    );

  if (ticketsList) {
    ticketsList.addEventListener(
      "click",
      (e) => {
        const save =
          e.target.closest(
            "[data-ticket-save]"
          );

        const del =
          e.target.closest(
            "[data-ticket-delete]"
          );

        if (save) {
          updateTicket(
            save.dataset.ticketSave
          );
        }

        if (del) {
          deleteTicket(
            del.dataset.ticketDelete
          );
        }
      }
    );
  }

  const saveProfileBtn =
    document.getElementById(
      "saveProfileBtn"
    );

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener(
      "click",
      saveProfile
    );
  }

  const resetProfileBtn =
    document.getElementById(
      "resetProfileBtn"
    );

  if (resetProfileBtn) {
    resetProfileBtn.addEventListener(
      "click",
      resetProfile
    );
  }

  const confirmOk =
    document.getElementById(
      "confirmOk"
    );

  if (confirmOk) {
    confirmOk.addEventListener(
      "click",
      () => closeConfirm(true)
    );
  }

  const confirmCancel =
    document.getElementById(
      "confirmCancel"
    );

  if (confirmCancel) {
    confirmCancel.addEventListener(
      "click",
      () => closeConfirm(false)
    );
  }

  const confirmOverlay =
    document.getElementById(
      "confirmOverlay"
    );

  if (confirmOverlay) {
    confirmOverlay.addEventListener(
      "click",
      (e) => {
        if (
          e.target ===
          e.currentTarget
        ) {
          closeConfirm(false);
        }
      }
    );
  }

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        closeConfirm(false);
      }
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    bindEvents();
    initAuth();
  }
);
