/* =========================================================================
   PRODOTTO.JS – descrizione dinamica + limite quantità stock
   ========================================================================= */

/***** CONFIG *****/
const PRODUCT_API_BASE = "/api/products";   // dettagli prodotto
const RATING_API_BASE  = "/api/rating";     // recensioni

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

/***** QUANTITÀ *****/
function setupQuantity(max) {
  const qtyInput = $("#quantity");
  qtyInput.value = 1;

  $("#increment")?.addEventListener("click", () => {
    const v = +qtyInput.value;
    if (v < max) qtyInput.value = v + 1;
  });

  $("#decrement")?.addEventListener("click", () => {
    const v = +qtyInput.value;
    if (v > 1) qtyInput.value = v - 1;
  });

  // Evita valori manuali > stock o <1
  qtyInput.addEventListener("change", () => {
    let v = +qtyInput.value || 1;
    v = Math.min(Math.max(v, 1), max);
    qtyInput.value = v;
  });
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
  // Titolo, prezzo, breve descrizione
  document.title = p.nome_prodotto;
  $(".product-title").textContent = p.nome_prodotto;
  $(".product-price").textContent = `€ ${parseFloat(p.prezzo).toFixed(2)}`;
  $(".product-description").textContent = p.descrizione || "";
  // Tab Dettagli – usa descrizione completa se presente
  const det = $("#details");
  if (det) det.innerHTML = `<h4>Informazioni Dettagliate</h4><p>${p.descrizione_dettagliata || p.descrizione || ""}</p>`;

  // Specifiche
  const list = $(".specs-list");
  list.innerHTML = "";
  (p.specifiche || "").split(";").filter(Boolean).forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s.trim();
    list.appendChild(li);
  });

  // Immagini
  const imgs = (p.immagini || []).map((o) => b64(o.immagine_base64));
  const main = $("#mainProductImage");
  main.src = imgs[0] || "/img/placeholderProduct.png";
  const thumbs = Array.from(document.querySelectorAll(".img-thumbnail"));
  thumbs.forEach((t, i) => {
    if (imgs[i]) {
      t.src = imgs[i];
      t.style.display = "block";
      t.addEventListener("click", () => (main.src = t.src));
    } else {
      t.style.display = "none";
    }
  });

  // Limite stock
  const stock = p.quant ?? 1;
  setupQuantity(stock);
  // Se esaurito, disabilita pulsante
  if (stock === 0) {
    $("#increment").disabled = true;
    $("#decrement").disabled = true;
    $("#quantity").value = 0;
    $(".add-to-cart").disabled = true;
    $(".add-to-cart").textContent = "Non disponibile";
  }
}

/***** RECENSIONI *****/
async function loadAverage(id) {
  try {
    const { media_voto = 0, numero_recensioni = 0 } = await fetchJSON(`${RATING_API_BASE}/${id}/average`);
    renderStarRating(media_voto);
    $(".reviews-count").textContent = `(${numero_recensioni} recension${numero_recensioni === 1 ? "e" : "i"})`;
  } catch (_) {}
}

async function loadReviews(id) {
  const wrap = $("#reviews-container");
  const emptyMsg = $("#no-reviews-message");
  try {
    const revs = await fetchJSON(`${RATING_API_BASE}/${id}`);
    if (!revs.length) {
      emptyMsg.style.display = "block";
      wrap.innerHTML = emptyMsg.outerHTML;
      return;
    }
    emptyMsg.style.display = "none";
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

function setupReviewForm(id) {
  const form = $("#review-form");
  if (!form) return;
  const ratingInput = $("#rating-value");
  const starWrap = $(".star-rating");
  starWrap.innerHTML = starIcons(0);
  starWrap.querySelectorAll("i").forEach((st, idx) => {
    const val = idx + 1;
    st.addEventListener("mouseover", () => (starWrap.innerHTML = starIcons(val)));
    st.addEventListener("mouseout", () => (starWrap.innerHTML = starIcons(+ratingInput.value)));
    st.addEventListener("click", () => {
      ratingInput.value = val;
      starWrap.innerHTML = starIcons(val);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const voto = +ratingInput.value;
    const txt  = $("#review-text").value.trim();
    if (!voto) return alert("Seleziona un voto da 1 a 5 stelle");
    try {
      form.querySelector("button[type=submit]").disabled = true;
      await fetchJSON(`${RATING_API_BASE}/${id}`, {
        method: "POST",
        body: JSON.stringify({ valutazione: voto, descrizione: txt })
      });
      form.reset();
      ratingInput.value = 0;
      starWrap.innerHTML = starIcons(0);
      loadAverage(id);
      loadReviews(id);
    } catch (err) {
      alert(err.message.includes("401") ? "Devi essere loggato e aver acquistato il prodotto." : "Errore invio recensione");
    } finally {
      form.querySelector("button[type=submit]").disabled = false;
    }
  });
}

/***** INIT ******/
document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return location.replace("/index.html");

  try {
    const p = await fetchJSON(`${PRODUCT_API_BASE}/${id}`);
    renderProduct(p);
    setupReviewForm(id);
    loadAverage(id);
    loadReviews(id);
  } catch (e) {
    alert("Prodotto non trovato");
    location.replace("/index.html");
  }
});
