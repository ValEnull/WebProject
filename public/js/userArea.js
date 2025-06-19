/* ====================================================================
   userArea.js – refactor 2025‑06
   Gestisce:
     • caricamento dati utente (JWT → fetch /api/users/:id)
     • modifica username, nome, cognome (campo "Nome completo" readonly)
     • modifica email
     • cambio password
     • eliminazione account
   ==================================================================== */

const API_BASE = "/api/users";

/* --------------------- UTIL --------------------- */
const $ = (sel) => document.querySelector(sel);

function parseJwt(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("token");
  location.replace("/login.html");
}

/* --------------------- API --------------------- */
async function api(url, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error((await res.text()) || res.status);
  return res.status === 204 ? {} : res.json();
}

/* ------------------- RENDER -------------------- */
function renderStatic(u) {
  // Nome utente in header e card
  [
    "h1 span.text-orange",
    ".card-body div.bg-light:nth-of-type(1)",
    "#usernameDisplay",
  ].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = u.nome_utente;
  });

  // Nome completo
  const fullName = `${u.nome} ${u.cognome}`.trim();
  [
    ".card-body .mb-3:nth-of-type(2) .bg-light",
    "#fullNameDisplay",
  ].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = fullName;
  });

  // Email
  ["#emailDisplay"].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = u.email;
  });
}

function renderInputs(u) {
  // Inputs nel modal info
  $("#currentUsername").value = u.nome_utente;
  $("#newUsername").value = "";
  $("#newFirstName").value = u.nome;
  $("#newLastName").value = u.cognome;
  $("#fullName").value = `${u.nome} ${u.cognome}`.trim();
  // Email modal
  $("#currentEmail").value = u.email;
  $("#newEmail").value = $("#confirmEmail").value = "";
}

function syncFullName() {
  const nome = $("#newFirstName").value.trim();
  const cognome = $("#newLastName").value.trim();
  $("#fullName").value = `${nome} ${cognome}`.trim();
}

/* -------------------- MAIN --------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const payload = parseJwt(token || "");
  if (!payload || payload.exp * 1000 < Date.now()) return logout();
  const uid = payload.id;

  // Carica dati utente
  let user;
  try {
    user = await api(`${API_BASE}/${uid}`);
    renderStatic(user);
    renderInputs(user);
  } catch (e) {
    console.error(e);
    alert("Utente non trovato o errore server");
    return logout();
  }

  /* --- Sincronizza fullName mentre l'utente digita --- */
  $("#newFirstName").addEventListener("input", syncFullName);
  $("#newLastName").addEventListener("input", syncFullName);

  /* --- Salva modifiche info personali --- */
  $("#infoModal .btn.btn-orange").addEventListener("click", async () => {
    const body = {};
    const nUser = $("#newUsername").value.trim();
    const nNome = $("#newFirstName").value.trim();
    const nCog = $("#newLastName").value.trim();

    if (nUser) body.nome_utente = nUser;
    if (nNome) body.nome = nNome;
    if (nCog) body.cognome = nCog;

    if (Object.keys(body).length === 0) {
      alert("Nessuna modifica da salvare");
      return;
    }

    try {
      user = await api(`${API_BASE}/${uid}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      renderStatic(user);
      renderInputs(user);
      bootstrap.Modal.getInstance($("#infoModal")).hide();
      alert("Informazioni aggiornate");
    } catch (err) {
      console.error(err);
      alert(err.message || "Errore aggiornamento");
    }
  });

  /* --- Modifica email --- */
  $("#emailModal .btn.btn-orange").addEventListener("click", async () => {
    const newE = $("#newEmail").value.trim();
    const confE = $("#confirmEmail").value.trim();
    if (newE !== confE) return alert("Le email non coincidono");

    try {
      user = await api(`${API_BASE}/${uid}/email`, {
        method: "PATCH",
        body: JSON.stringify({ email: newE }),
      });
      renderStatic(user);
      renderInputs(user);
      bootstrap.Modal.getInstance($("#emailModal")).hide();
      alert("Email aggiornata");
    } catch (err) {
      console.error(err);
      alert(err.message || "Errore email");
    }
  });

  /* --- Cambio password --- */
  $("#passwordForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldP = $("#currentPassword").value;
    const newP = $("#newPassword").value;
    const confP = $("#confirmPassword").value;
    if (newP !== confP) return alert("Le password non coincidono");
    try {
      await api(`${API_BASE}/${uid}/password`, {
        method: "PATCH",
        body: JSON.stringify({ oldPassword: oldP, newPassword: newP }),
      });
      ["#currentPassword", "#newPassword", "#confirmPassword"].forEach((s) =>
        $(s).value = ""
      );
      alert("Password aggiornata");
    } catch (err) {
      console.error(err);
      alert(err.message || "Errore password");
    }
  });

  /* --- Elimina account --- */
  $("#deleteAccountForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if ($("#confirmDelete").value.trim() !== "ELIMINA ACCOUNT")
      return alert("Conferma errata");
    try {
      await api(`${API_BASE}/${uid}`, {
        method: "DELETE",
        body: JSON.stringify({ password: $("#currentPasswordDelete").value }),
      });
      alert("Account eliminato");
      logout();
    } catch (err) {
      console.error(err);
      alert(err.message || "Errore eliminazione");
    }
  });
});
