purgeIfNeeded();

/* =====================
   PROMO BANNER ROTATOR
   ===================== */

const promoMessages = [
  "Spedizione gratuita per ordini sopra €50!",
  "Collezione estiva disponibile ora!",
  "Lo stai cercando? Lo abbiamo!",
  "Nuovi arrivi ogni settimana!",
  "Spedizione entro 3 giorni lavorativi!",
  "Nuove promozioni ogni mese!",
  "Inizia ora a cercare il regalo perfetto!"
];

function startPromoBanner() {
  const promoText = document.getElementById("promo-text");
  if (!promoText) return; // banner non presente in questa pagina

  let currentIndex = 0;
  setInterval(() => {
    promoText.style.opacity = 0;
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % promoMessages.length;
      promoText.textContent = promoMessages[currentIndex];
      promoText.style.opacity = 1;
    }, 500);
  }, 7000);
}

/* ============================
   PRODOTTO IN EVIDENZA RANDOM
   ============================ */

function showFeaturedFrom(prodotti = []) {
  if (!Array.isArray(prodotti) || !prodotti.length) return;

  const productImage = document.getElementById("product-image");
  const productTitle = document.getElementById("product-title");
  const productDescription = document.getElementById("product-description");
  const productLink = document.getElementById("featured-link");

  if (!productImage || !productTitle || !productDescription || !productLink) return;

  const p = prodotti[Math.floor(Math.random() * prodotti.length)];

  const imgSrc = p.immagine_principale
    ? `data:image/png;base64,${p.immagine_principale}`
    : "/img/placeholderProduct.png";

  productImage.src = imgSrc;
  productTitle.textContent = p.nome_prodotto;
  productDescription.textContent = p.descrizione || "";
  productLink.href = `prodotto.html?id=${p.prodotto_id}`;
}



/* =================================
   DOM READY – CONFIGURAZIONE PAGINA
   ================================= */

document.addEventListener("DOMContentLoaded", () => {

  
  // 1. Promo banner & prodotto in evidenza
  startPromoBanner();
  updateCartBadge();

  // 2. Nav categorie (link con class="category-link" e data-category-id="<id>")
  document.querySelectorAll(".category-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      currentCategoryId = e.currentTarget.dataset.categoryId || null;

      document.querySelectorAll(".category-link").forEach((l) =>
        l.classList.remove("active")
      );
      e.currentTarget.classList.add("active");

      loadProducts(1);
    });
  });

  // 3. Barra di ricerca (clic su bottone o invio)
  const searchInput = document.getElementById("search");
  const searchBtn   = document.getElementById("search-btn");

  if (searchInput && searchBtn) {
    searchBtn.addEventListener("click", () => loadProducts(1));
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadProducts(1);
    });
  }


  // 4. Dropdown utente + logout
  setupUserDropdown();

  // 5. Prima popolazione prodotti
  loadProducts(1);
});

/* =====================
   USER / AUTH HANDLING
   ===================== */
function setupUserDropdown() {
  const dropdownLogged = document.getElementById("user-dropdown-logged");
  const dropdownUnlogged = document.getElementById("user-dropdown-unlogged");
  const cartBtn    = document.getElementById("cart-btn");  
  const logoutBtn = document.getElementById("logout-btn");

  const token = localStorage.getItem("token");

  const isTokenValid = (token) => {
    if (!token) return false;
    const decoded = parseJwt(token);
    if (!decoded || !decoded.exp) return false;
    return decoded.exp > Date.now() / 1000;
  };

  if (token && isTokenValid(token)) {
    dropdownLogged?.classList.remove("d-none");
    dropdownUnlogged?.classList.add("d-none");
    cartBtn?.classList.remove("d-none"); 
  } else {
    dropdownLogged?.classList.add("d-none");
    dropdownUnlogged?.classList.remove("d-none");
    cartBtn?.classList.add("d-none");   
    localStorage.removeItem("token");
  }

  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("token");
    location.reload();
  });
}

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/* =========================================
   TOKEN GUARD – invalida admin / venditore
   ========================================= */
function isAdminOrVenditore(payload) {
  // 2 = admin  |  3 = venditore
  return payload && (payload.ruolo_id === 2 || payload.ruolo_id === 3);
}

function shouldDiscardToken(payload) {
  const now = Date.now() / 1000;          // seconds
  return !payload                 ||      // non decodificabile
         payload.exp < now        ||      // scaduto
         isAdminOrVenditore(payload);     // ruolo non ammesso in index
}

function purgeIfNeeded() {
  let token = localStorage.getItem("token");
  if (!token) return;

  // ✅ rimuove "Bearer " se presente
  if (token.startsWith("Bearer ")) {
    token = token.slice(7); // rimuove "Bearer "
  }

  const payload = parseJwt(token);
  console.log("🧾 JWT Payload:", payload);

  const now = Date.now() / 1000;
  const role = payload?.ruolo_id;

  const mustLogout = !payload || payload.exp < now || [2, 3].includes(role);
  console.log("⛔ Deve sloggare?", mustLogout);

  if (mustLogout) {
    console.warn("🔴 Token non valido o ruolo non ammesso. Logout forzato.");
    localStorage.removeItem("token");
    location.reload(); // oppure: window.location.replace("/login.html");
  }
}


/***** helper fetch *****/
async function fetchJSON(url, opts = {}) {
  const token   = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(opts?.headers||{}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/***** BADGE CARRELLO *****/
async function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;                        // elemento non trovato (es. admin)
  const btn   = document.getElementById("cart-btn");

  const token = localStorage.getItem("token");
  if (!token) {                              // utente non loggato
    badge.textContent = "0";
    btn.classList.add("d-none");
    return;
  }

  try {
    const { prodotti = [] } = await fetchJSON("/api/orders/carrello");
    const tot = prodotti.reduce((acc, p) => acc + p.quantita, 0);
    badge.textContent = tot;
    btn.classList.toggle("d-none", tot === 0);   // se 0 articoli nasconde btn
  } catch {
    badge.textContent = "0";
    btn.classList.add("d-none");
  }
}


/* ============================
   FETCH & RENDERING  PRODOTTI
   ============================ */

/************************************
 *  COSTANTI
 ************************************/
const limit = 12;          // quante card per pagina
let currentPage       = 1; // pagina attualmente visualizzata
let currentCategoryId = null;      // null = tutte le categorie

/************************************
 *  MAIN: caricamento prodotti
 ************************************/
async function loadProducts(page = 1) {
  currentPage = page;   // tieni traccia dell’ultima pagina richiesta

  /* 1️⃣  Costruisci la query-string in modo sicuro */
  const params = new URLSearchParams({
    page,               // es. 1, 2, 3 …
    limit               // 12
  });

  const search = document.getElementById("search")?.value.trim();
  if (search) params.set("search", search);

  /* 2️⃣  Scegli l’endpoint (tutte le tipologie o una sola) */
  let url;
  if (currentCategoryId) {
    url = `/api/products/tipologia/${currentCategoryId}?${params.toString()}`;
  } else {
    url = `/api/products?${params.toString()}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    /* 3️⃣  La risposta ha già la struttura paginata */
    const { prodotti, total, page: srvPage, limit: srvLimit } = await res.json();

    renderProducts(prodotti);                     // card nella grid
    renderPagination(total, srvPage, srvLimit);   // bottoni numerati
    showFeaturedFrom(prodotti);                   // “prodotto in evidenza”

  } catch (err) {
    console.error("Errore nella fetch prodotti:", err);
  }
}

function renderProducts(prodotti = []) {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = "";

  prodotti.forEach((p) => {
    const col = document.createElement("div");
    col.className = "col";

    const imgSrc = p.immagine_principale
      ? `data:image/png;base64,${p.immagine_principale}`
      : "/img/placeholderProduct.png";

    col.innerHTML = `
      <div class="card h-100 border-0 shadow-sm" style="cursor:pointer;" onclick="location.href='prodotto.html?id=${p.prodotto_id}'">
        <img src="${imgSrc}" class="card-img-top" alt="${p.nome_prodotto}">
        <div class="card-body d-flex flex-column text-center">
          <h6 class="card-title mb-1">${p.nome_prodotto}</h6>
          <span class="text-muted small">${p.nome_artigiano}</span>
          <strong class="mt-1">€ ${parseFloat(p.prezzo).toFixed(2)}</strong>
          <button class="btn btn-orange btn-sm mt-auto">Vedi dettagli</button>
        </div>
      </div>`;

    container.appendChild(col);
  });
}

function renderPagination(total, currentPage, limit) {
  const container = document.getElementById("pagination");
  if (!container) return;

  container.innerHTML = "";
  const totalPages = Math.ceil(total / limit);

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === currentPage ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener("click", e => {
      e.preventDefault();
      loadProducts(i);          // ricarica pagina i
    });
    container.appendChild(li);
  }
}

/***************************
 *  AUTH UI TOGGLER
 ***************************/
function refreshAuthUI() {
  const token  = localStorage.getItem("token");

  /* elementi */
  const ddLogged   = document.getElementById("user-dropdown-logged");
  const ddUnlogged = document.getElementById("user-dropdown-unlogged");
  const cartBtn    = document.getElementById("cart-btn");
  const badge      = document.getElementById("cart-badge");

  /* utente NON loggato */
  if (!token) {
    ddLogged?.classList.add("d-none");
    ddUnlogged?.classList.remove("d-none");
    cartBtn?.classList.add("d-none");
    badge.textContent = "0";
    return;
  }

  /* utente loggato */
  ddLogged?.classList.remove("d-none");
  ddUnlogged?.classList.add("d-none");
  cartBtn?.classList.remove("d-none");

  /* badge quantità */
  updateCartBadge();   // ↓ definita sotto
}


/***************************
 *  DOM READY
 ***************************/
document.addEventListener("DOMContentLoaded", () => {
  refreshAuthUI();

  /* esempio: se hai già funzioni login/logout */
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    refreshAuthUI();
  });
  
    /* 🔄 1.  Aggiorna badge quando la pagina torna visibile */
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateCartBadge();
  });

  /* 🔄 2. (opzionale) Aggiorna anche quando torna il focus alla finestra */
  window.addEventListener("focus", updateCartBadge);

  /* se altrove chiami login() dopo aver salvato il token, termina con: */
  // refreshAuthUI();
});