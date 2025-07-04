document.addEventListener('DOMContentLoaded', function() {
    function updateTotals() {
        let total = 0;
        document.querySelectorAll('#cart-body .mb-3.position-relative').forEach(card => {
            const price = parseFloat(card.querySelector('.price').textContent.replace(',', '.'));
            const qty = parseInt(card.querySelector('.quantity').value);
            const itemTotal = (price * qty).toFixed(2);
            card.querySelector('.item-total').textContent = itemTotal;
            total += parseFloat(itemTotal);
        });
        document.getElementById('cart-total').textContent = total.toFixed(2);
    }

    function attachEvents() {
        document.querySelectorAll('.quantity').forEach(input => {
            input.addEventListener('input', function() {
                if (this.value < 1) this.value = 1;
                updateTotals();
            });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.mb-3.position-relative').remove();
                updateTotals();
            });
        });
    }

    updateTotals();
    attachEvents();
});

/***** carrello.js – versione dinamica *****/
async function fetchJSON(url, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const cartBody   = document.getElementById("cart-body");
const cartTotal  = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
checkoutBtn.disabled = true;
checkoutBtn.addEventListener("click", () => {
  if (checkoutBtn.disabled) return;
  location.href = "/payment.html";          // cambia con la tua pagina reale
});

const tpl = ({ prodotto_id, nome_prodotto, descrizione, prezzo_unitario,
               quantita, totale, immagine_principale }) => `
  <div class="mb-3 position-relative cart-item" data-id="${prodotto_id}">
    <div class="row g-0 align-items-center p-2">
      <div class="col-md-3 text-center">
        <img class="img-fluid rounded product-img"
             src="${immagine_principale
               ? `data:image/png;base64,${immagine_principale}`
               : "/img/placeholderProduct.png"}"
             alt="${nome_prodotto}">
      </div>
      <div class="col-md-9 ps-md-3">
        <div class="card-body p-2">
          <button class="btn btn-danger btn-sm remove-btn">
            <i class="fas fa-trash"></i> Rimuovi
          </button>
          <h5 class="card-title mb-1">${nome_prodotto}</h5>
          <p class="card-text mb-2 text-muted product-description">
            ${descrizione || ""}
          </p>
          <div class="d-flex flex-wrap align-items-center mb-2 price-section">
            <span class="me-3 fs-5 price-display">
              € <span class="price">${parseFloat(prezzo_unitario).toFixed(2)}</span>
            </span>
            <div class="d-flex align-items-center quantity-control">
              <label class="me-2 mb-0">Quantità:</label>
              <input type="number" class="form-control quantity"
                     value="${quantita}" min="1">
            </div>
            <span class="ms-md-3 mt-2 mt-md-0 total-display">
              Totale: € <span class="item-total">${parseFloat(totale).toFixed(2)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>`;

function updateCartTotal() {
  let tot = 0;
  cartBody.querySelectorAll(".item-total").forEach(
    el => (tot += parseFloat(el.textContent.replace(",", ".")))
  );
  cartTotal.textContent = tot.toFixed(2);
  checkoutBtn.disabled = cartBody.querySelectorAll(".cart-item").length === 0;
}

function attachHandlers(card) {
  const qtyInput = card.querySelector(".quantity");
  const price    = parseFloat(card.querySelector(".price").textContent);
  let   lastQty  = +qtyInput.value;

   /* ───── 1. recupera lo stock rimasto e imposta il limite ───── */
  let maxStock = Infinity;                    // limite iniziale
  (async () => {
    try {
      const prod = await fetchJSON(`/api/products/${card.dataset.id}`);
      const remaining = +prod.quant || +prod.stock || Infinity; // ← adatta se il campo si chiama diversamente
      maxStock  = remaining + lastQty;          //  pezzi liberi  +   già presenti nel carrello
      qtyInput.max = maxStock;                  // HTML5: le frecce non superano il limite

      // se l’utente aveva già più pezzi di quelli ora disponibili
      if (+qtyInput.value > maxStock) {
        qtyInput.value = maxStock;
        card.querySelector(".item-total").textContent = (price * maxStock).toFixed(2);
        updateCartTotal();
      }
    } catch (err) {
      console.warn("Impossibile leggere stock:", err);
    }
  })();

  /* PATCH al server con debounce 600 ms */
  let timer = null;

  qtyInput.addEventListener("input", () => {
    let v = +qtyInput.value || 1;
    if (v < 1) v = 1;
    if (v > maxStock) {                       // oltre lo stock? blocca
      v = maxStock;
      alert("Quantità massima disponibile raggiunta"); // puoi sostituire con showToast()
    }
    qtyInput.value = v;


    card.querySelector(".item-total").textContent = (price * v).toFixed(2);
    updateCartTotal();

    clearTimeout(timer);
    timer = setTimeout(patchQty, 600); 
  });

    async function patchQty() {
    const v = +qtyInput.value;
    if (v === lastQty) return;

    try {
      await fetchJSON(`/api/orders/carrello/${card.dataset.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantita: v })
      });
      lastQty = v;                             // ok, aggiornato
    } catch (err) {
      alert(err.message.includes("400")
        ? "Quantità non disponibile."
        : "Errore aggiornamento carrello.");
      qtyInput.value = lastQty;                // ripristina valore valido
      card.querySelector(".item-total").textContent = (price * lastQty).toFixed(2);
      updateCartTotal();
    }
  }

  /* rimozione prodotto */
  card.querySelector(".remove-btn").addEventListener("click", async () => {
    const id = card.dataset.id;
    try {
      await fetchJSON(`/api/orders/carrello/${id}`, { method: "DELETE" });
      card.remove();
      updateCartTotal();
      if (!cartBody.children.length) cartBody.innerHTML =
        '<p class="text-center my-5">Il carrello è vuoto.</p>';
    } catch (_) {
      alert("Errore nella rimozione prodotto");
    }
  });
}

async function loadCart() {
  try {
    const { prodotti = [], costo_totale } = await fetchJSON("/api/orders/carrello");
    if (!prodotti.length) {
      cartBody.innerHTML = '<p class="text-center my-5">Il carrello è vuoto.</p>';
      cartTotal.textContent = "0.00";
      updateCartTotal();            
      return;
    }
    cartBody.innerHTML = prodotti.map(tpl).join("");
    cartTotal.textContent = parseFloat(costo_totale).toFixed(2);

    cartBody.querySelectorAll(".cart-item").forEach(attachHandlers);
    updateCartTotal();  
  } catch (err) {
    if (err.message.includes("404")) {
      // ✅ Carrello vuoto gestito dal server con 404
      cartBody.innerHTML = '<p class="text-center my-5 text-muted">Il tuo carrello è vuoto.</p>';
      cartTotal.textContent = "0.00";
      checkoutBtn.disabled = true;
    } else {
      // ❌ Errore generico
      cartBody.innerHTML = '<p class="text-danger">Errore nel caricamento del carrello.</p>';
      cartTotal.textContent = "0.00";
      checkoutBtn.disabled = true;
    }
  }
}
document.addEventListener("DOMContentLoaded", loadCart);
