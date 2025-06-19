/* =====================
   PROMO BANNER ROTATOR
   ===================== */

const promoMessages = [
  "Sconto inaugurazione 15% su tutti i prodotti!",
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

const featuredProducts = [
  {
    image: "/img/piattoApi.jpeg",
    title: "Piatto decorato a mano",
    description:
      "Bellissimo piatto decorato a mano raffigurante api e fiorellini. Un regalo perfetto per chi ama la natura e i picnic!"
  },
  {
    image: "/img/fermaPortaPolli.jpg",
    title: "Fermaporte divertenti a forma di polli",
    description:
      "Divertenti e simpaticissimi fermaporta. Disponibili in varie colorazioni e misure. Perfetti per la casa o per un regalo originale!"
  },
  {
    image: "/img/operaMetallo.png",
    title: "Opera artigianale con materiali riciclati",
    description:
      "Opera artigianale realizzata a mano con materiali di recupero. Un pezzo unico che aggiunge un tocco di originalità a qualsiasi ambiente!"
  }
];

function showRandomFeaturedProduct() {
  const productImage = document.getElementById("product-image");
  const productTitle = document.getElementById("product-title");
  const productDescription = document.getElementById("product-description");

  if (!productImage || !productTitle || !productDescription) return; // sezione non presente

  const randomProduct =
    featuredProducts[Math.floor(Math.random() * featuredProducts.length)];

  productImage.src = randomProduct.image;
  productTitle.textContent = randomProduct.title;
  productDescription.textContent = randomProduct.description;
}

/* ================
   GLOBAL STATE
   ================ */
let currentPage = 1;
const limit = 12;
let currentCategoryId = null; // null => tutte le categorie

/* =================================
   DOM READY – CONFIGURAZIONE PAGINA
   ================================= */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Promo banner & prodotto in evidenza
  startPromoBanner();
  showRandomFeaturedProduct();

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

  // 3. Barra di ricerca (se presente)
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.addEventListener("input", () => loadProducts(1));
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
  } else {
    dropdownLogged?.classList.add("d-none");
    dropdownUnlogged?.classList.remove("d-none");
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

/* ============================
   FETCH & RENDERING  PRODOTTI
   ============================ */

async function loadProducts(page = 1) {
  const search = document.getElementById("search")?.value.trim() || "";

  let url;
  if (currentCategoryId) {
    // nuova API filtrata per tipologia
    url = `/api/products/tipologia/${currentCategoryId}?page=${page}&limit=${limit}`;
  } else {
    // lista completa (eventuale ricerca)
    url = `/api/products?page=${page}&limit=${limit}`;
  }

  if (search) {
    // la tua API per tipologia non gestisce la ricerca: aggiungila se vuoi
    url += `&search=${encodeURIComponent(search)}`;
  }

  console.log("Chiamo API con URL:", url);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    /*
      L'endpoint /tipologia/:id restituisce solo "prodotti".
      Per ri‑usare lo stesso renderer, simuliamo il vecchio formato se necessario.
    */
    const prodotti = Array.isArray(data) ? data : data.prodotti;
    const total    = data.total || prodotti.length;

    renderProducts(prodotti);
    renderPagination(total, page, limit);
    currentPage = page;
  } catch (err) {
    console.error("Errore nella fetch:", err);
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

function renderPagination(total, page, limit) {
  const container = document.getElementById("pagination");
  if (!container) return;
  container.innerHTML = "";

  const totalPages = Math.ceil(total / limit);
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === page ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener("click", (e) => {
      e.preventDefault();
      loadProducts(i);
    });
    container.appendChild(li);
  }
}
