/* =========================================================================
   PRODOTTO.JS – descrizione dinamica + limite quantità stock
   ========================================================================= */

/***** CONFIG *****/
const PRODUCT_API_BASE = "/api/products";
const RATING_API_BASE  = "/api/rating";

/***** UTILITY *****/
const $ = (sel) => document.querySelector(sel);

const b64 = (buf) => (!buf || typeof buf !== "string")
  ? "/img/placeholderProduct.png"
  : buf.startsWith("data:") ? buf : `data:image/png;base64,${buf}`;

async function fetchJSON(url, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/***** AUTH UI TOGGLER – identica su tutte le pagine *****/
function refreshAuthUI() {
  const token = localStorage.getItem("token");

  /* Elementi coinvolti */
  const ddLogged   = document.getElementById("user-dropdown-logged");
  const ddUnlogged = document.getElementById("user-dropdown-unlogged");
  const cartBtn    = document.getElementById("cart-btn");
  const badge      = document.getElementById("cart-badge");

  /* =====================
     UTENTE NON LOGGATO
     ===================== */
  if (!token) {
    ddLogged?.classList.add("d-none");      // nasconde menu loggato
    ddUnlogged?.classList.remove("d-none"); // mostra menu anonimo
    cartBtn?.classList.add("d-none");       // NASCONDE ICONA CARRELLO
    if (badge) badge.textContent = "0";
    return;
  }

  /* =====================
     UTENTE LOGGATO
     ===================== */
  ddLogged?.classList.remove("d-none");     // mostra menu loggato
  ddUnlogged?.classList.add("d-none");      // nasconde menu anonimo
  cartBtn?.classList.remove("d-none");      // mostra icona carrello
  updateCartBadge();                        // ricalcola quantità
}


/***** BADGE CARRELLO *****/
async function updateCartBadge() {
  const badge = document.querySelector("#cart-badge");
  if (!badge) return;

  const token = localStorage.getItem("token");
  if (!token) return badge.textContent = "0";

  try {
    const { prodotti = [] } = await fetchJSON("/api/orders/carrello");
    const totale = prodotti.reduce((acc, p) => acc + p.quantita, 0);
    badge.textContent = totale;
  } catch (_) {
    badge.textContent = "0";
  }
}

/***** QUANTITÀ *****/
function setupQuantity(max) {
  const qty   = $("#quantity");
  const inc   = $("#increment");
  const dec   = $("#decrement");

  /* imposta attributi e valore di partenza */
  qty.max   = max;                       // <input>.max è string, ma OK
  qty.value = max === 0 ? 0 : 1;         // sempre da 1   (0 se esaurito)

  /* blocca i pulsanti se lo stock è finito */
  inc.disabled = dec.disabled = max === 0;

  /* listener aggiunti una sola volta */
  if (!qty.dataset.bound) {
    inc?.addEventListener("click", () => {
      const lim = +qty.max;
      if (+qty.value < lim) qty.value++;
    });

    dec?.addEventListener("click", () => {
      if (+qty.value > 1) qty.value--;
    });

    qty.addEventListener("change", () => {
      const lim = +qty.max;
      let v = +qty.value || 1;
      qty.value = Math.min(Math.max(v, 1), lim);
    });

    qty.dataset.bound = "1";
  }
}

/***** STARS *****/
const starIcons = (n) => Array.from({ length: 5 }, (_, i) =>
  i < n ? '<i class="fas fa-star text-warning"></i>' : '<i class="far fa-star text-warning"></i>'
).join("");

function renderStarRating(avg) {
  const box = $(".stars-container");
  if (box) box.innerHTML = starIcons(Math.round(avg));
}

/***** RENDER PRODOTTO *****/
function renderProduct(p) {
  /* titolo - descrizione */
  document.title = p.nome_prodotto;
  $(".product-title").textContent  = p.nome_prodotto;
  $(".product-price").textContent  = `€ ${parseFloat(p.prezzo).toFixed(2)}`;
  $(".product-description").textContent = p.descrizione || "";
  $("#details").innerHTML =
    `<h4>Informazioni Dettagliate</h4><p>${p.descrizione_dettagliata || p.descrizione || ""}</p>`;

  /* specifiche */
  const list = $(".specs-list");
  list.innerHTML = "";
  (p.specifiche || "")
    .split(";")
    .filter(Boolean)
    .forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s.trim();
      list.appendChild(li);
    });

  // Immagini
  const imgs = (p.immagini || []).map(o => b64(o.immagine_base64));
  const main = $("#mainProductImage");
  const thumbContainer = $("#thumbnailContainer");

  // Set main image
  main.src = imgs[0] || "/img/placeholderProduct.png";

  // Crea thumbnail dinamicamente
  thumbContainer.innerHTML = "";
  imgs.forEach((src, i) => {
    const t = document.createElement("img");
    t.src = src;
    t.className = "img-thumbnail cursor-pointer";
    t.style.objectFit = "cover";
    t.onclick = () => { main.src = src };
    thumbContainer.appendChild(t);
  });

  /* stock */
  const stock = +p.quant || 0;
  setupQuantity(stock);
  setupAddToCartButton(p.prodotto_id, stock);
}

/***** RECENSIONI (unchanged) *****/
async function loadAverage(id) {
  try {
    const { media_voto = 0, numero_recensioni = 0 } =
      await fetchJSON(`${RATING_API_BASE}/${id}/average`);
    renderStarRating(media_voto);
    $(".reviews-count").textContent =
      `(${numero_recensioni} recension${numero_recensioni === 1 ? "e" : "i"})`;
  } catch (_) {}
}

async function loadReviews(id) {
  const wrap = $("#reviews-container");
  const empty = $("#no-reviews-message");
  try {
    const revs = await fetchJSON(`${RATING_API_BASE}/${id}`);
    console.log("Recensioni dal server:", revs.length, revs);
    if (!revs.length) {
      empty.style.display = "block";
      wrap.innerHTML = empty.outerHTML; return;
    }
    empty.style.display = "none";
    wrap.innerHTML = revs.map(renderReviewHTML).join("");
  } catch (_) {}
}

const renderReviewHTML = (r) => {
  const date = new Date(r.data_recensione).toLocaleDateString("it-IT");
  return `<div class="review-card border rounded p-3 mb-3">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div><strong>${r.nome_utente}</strong><br>${starIcons(r.valutazione)}</div>
        <span class="text-muted small">${date}</span>
      </div>
      <p class="mb-0">${r.descrizione || "(nessun testo)"}</p>
    </div>`;
};

/***** ...PRECEDENTE CODICE FINO A setupReviewForm OMITTED PER BREVITÀ... *****/

function setupReviewForm(id) {
  const form = $("#review-form");
  if (!form) return;

  const ratingInput = $("#rating-value");
  const starWrap = $(".star-rating");
  let selected = 0;

  // Crea le stelle dinamicamente
  starWrap.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("i");
    star.classList.add("fa-star", "far"); // inizia come vuota
    star.dataset.value = i;
    star.style.cursor = "pointer";

    star.addEventListener("mouseover", () => {
      highlightStars(i);
    });

    star.addEventListener("mouseout", () => {
      highlightStars(selected);
    });

    star.addEventListener("click", () => {
      selected = i;
      ratingInput.value = i;
      highlightStars(selected);
    });

    starWrap.appendChild(star);
  }

  function highlightStars(n) {
    starWrap.querySelectorAll("i").forEach((s, idx) => {
      if (idx < n) {
        s.classList.remove("far");
        s.classList.add("fas", "active");
      } else {
        s.classList.remove("fas", "active");
        s.classList.add("far");
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const voto = +ratingInput.value;
    const descrizione = $("#review-text").value.trim();

    if (!voto) return alert("Seleziona un voto da 1 a 5 stelle");
    try {
      form.querySelector("button[type=submit]").disabled = true;
      await fetchJSON(`${RATING_API_BASE}/${id}`, {
        method: "POST",
        body: JSON.stringify({ valutazione: voto, descrizione })
      });

      alert("Recensione inviata con successo!");
      form.reset();
      selected = 0;
      ratingInput.value = "";
      highlightStars(0);
      loadAverage(id);
      loadReviews(id);
    } catch (err) {
      const msg = err.message.includes("401")
          ? "Devi essere loggato per inserire una recensione."
          : err.message.includes("409")
              ? "Hai già recensito questo prodotto."
              : "Errore invio recensione.";
      alert(msg);
    } finally {
      form.querySelector("button[type=submit]").disabled = false;
    }
  });
}


/***** ADD-TO-CART *****/
function setupAddToCartButton(prodId, stock) {
  const btn = $(".add-to-cart");
  if (btn.dataset.bound) return;

  // disabilita per anonimi
  if (!localStorage.getItem("token")) btn.setAttribute("disabled", "true");

  btn.addEventListener("click", async () => {
    const token = localStorage.getItem("token");
    if (!token) {                       // safety
      alert("Devi essere loggato per aggiungere articoli al carrello.");
      return;
    }

    const qty = +$("#quantity").value || 1;   // quantità scelta ora
    btn.disabled = true;

    try {
      /* 1️⃣ Prova a inserire normalmente */
      await fetchJSON(`/api/orders/carrello/${prodId}`, {
        method: "POST",
        body: JSON.stringify({ quantita: qty })
      });

    } catch (err) {
      /* 2️⃣ Se l’articolo è già presente (400 o 409) ricalcola il totale */
      if (/HTTP\s(400|409)/.test(err.message)) {
        // ⇢ ottieni la quantità attuale dal carrello
        const { prodotti = [] } = await fetchJSON("/api/orders/carrello");
        const voce = prodotti.find(p => p.prodotto_id === prodId) || {};
        const nuovoTotale = (voce.quantita || 0) + qty;

        // ⇢ PATCH con la NUOVA QUANTITÀ assoluta
        await fetchJSON(`/api/orders/carrello/${prodId}`, {
          method: "PATCH",
          body: JSON.stringify({ quantita: nuovoTotale })
        });
      } else {
        throw err; // errori diversi
      }
    }

    /* UI e stock */
    await updateCartBadge();
    const { quant = 0 } = await fetchJSON(`${PRODUCT_API_BASE}/${prodId}`);
    setupQuantity(+quant);

    if (+quant === 0) {
      btn.disabled = true;
      btn.textContent = "Non disponibile";
    } else {
      btn.disabled = false;
    }

    alert("Prodotto aggiunto al carrello");
  });

  btn.dataset.bound = "1";
}

/***** INIT *****/
document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id");
  refreshAuthUI();
  if (!id) return location.replace("/index.html");

  try {
    const p = await fetchJSON(`${PRODUCT_API_BASE}/${id}`);
    renderProduct(p);
    setupReviewForm(id);
    loadAverage(id);
    loadReviews(id);
  } catch (_) {
    alert("Prodotto non trovato");
    location.replace("/index.html");
  }

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    location.reload();
  });

});

updateCartBadge();