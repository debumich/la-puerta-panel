let _autoRefreshTimer = null;
let _pendingAuthMsg = null;

async function resolveRole(user) {
  const email = (user.email || "").toLowerCase();

  if (!email) {
    return {
      role: "public"
    };
  }

  if (ADMIN_EMAILS.map((x) => x.toLowerCase()).includes(email)) {
    const snap = await db.collection("users").doc(email).get();

    return {
      role: "admin",
      email,
      displayName: snap.exists
        ? snap.data().displayName || user.displayName || ""
        : user.displayName || "",
      avatarUrl: snap.exists
        ? snap.data().avatarUrl || user.photoURL || ""
        : user.photoURL || ""
    };
  }

  const doc = await db.collection("users").doc(email).get();

  if (doc.exists && doc.data().faction) {
    return {
      role: "leader",
      email,
      faction: doc.data().faction,
      displayName: doc.data().displayName || user.displayName || "",
      avatarUrl: doc.data().avatarUrl || user.photoURL || ""
    };
  }

  return {
    role: "public",
    email
  };
}

async function initAuth() {
  auth
    .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch(() => {});

  auth.getRedirectResult().catch((err) => {
    if (err && err.code !== "auth/no-auth-event") {
      showAuthMessage(humanAuthError(err), true);
    }
  });

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      currentUser = {
        role: "public"
      };

      profileData = {};

      enterApp();
      return;
    }

    showAuthMessage("Проверяем доступ…");

    try {
      currentUser = await resolveRole(user);

      if (currentUser.role === "public") {
        _pendingAuthMsg = {
          text: "Аккаунт не привязан к фракции. Открыт публичный режим.",
          error: false
        };

        await auth.signOut();
        return;
      }

      profileData = {
        ...currentUser
      };

      enterApp();
    } catch (err) {
      console.error(err);

      _pendingAuthMsg = {
        text: "Не удалось проверить доступ.",
        error: true
      };

      await auth.signOut();
    }
  });
}

function login() {
  const provider = new firebase.auth.GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account"
  });

  auth.signInWithPopup(provider).catch((err) => {
    if (err.code === "auth/popup-blocked") {
      auth.signInWithRedirect(provider);
      return;
    }

    if (
      err.code !== "auth/popup-closed-by-user" &&
      err.code !== "auth/cancelled-popup-request"
    ) {
      showAuthMessage(humanAuthError(err), true);
    }
  });
}

function logout() {
  auth
    .signOut()
    .catch(() => {})
    .finally(() => toast("Вы вышли из аккаунта"));
}

function humanAuthError(err) {
  const map = {
    "auth/network-request-failed": "Нет соединения с сетью.",
    "auth/unauthorized-domain":
      "Домен не добавлен в Firebase Authentication.",
    "auth/too-many-requests":
      "Слишком много попыток. Попробуйте позже."
  };

  return (
    map[err.code] ||
    `Ошибка входа: ${err.message || err.code || "неизвестная"}`
  );
}

function showAuthMessage(text, isError) {
  const el = document.getElementById("authState");

  el.textContent = text || "";
  el.classList.toggle("error", !!isError);
}

function enterApp() {
  document.getElementById("authScreen").hidden = true;
  document.getElementById("app").hidden = false;

  renderHeader();

  switchTab(
    currentUser?.role === "public"
      ? "leaders"
      : "home"
  );

  bootData();
  loadProfileToUI();
}

function bootData() {
  renderLeadersSkeleton();

  loadCachedLeaders();

  if (leaderData) {
    applyLeaderData();
  }

  fetchLeaders(false);

  if (currentUser?.role !== "public") {
    refreshReports();
  }

  if (_autoRefreshTimer) {
    clearInterval(_autoRefreshTimer);
  }

  _autoRefreshTimer = setInterval(() => {
    fetchLeaders(false);
  }, AUTO_REFRESH_MIN * 60000);
}

function loadCachedLeaders() {
  try {
    const raw = localStorage.getItem("leaderData");

    if (raw) {
      leaderData = JSON.parse(raw);
    }
  } catch (e) {}
}
