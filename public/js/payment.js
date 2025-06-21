/**************************************************************************
 * payment.js – checkout con spedizione gratis oltre 50 €
 **************************************************************************/

/* ---------- CONFIG --------------------------------------------------- */
const FREE_SHIPPING_THRESHOLD = 50;
const STANDARD_SHIPPING_COST  = 4.99;
const REQUIRED_IDS = [
  "cap","city","address","province","country",
  "cardName","cardNumber","expiryDate","cvv"
];

/* ---------- FETCH helper --------------------------------------------- */
async function fetchJSON(url, opts = {}) {
  const token   = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(opts.headers||{}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------- Spedizione ----------------------------------------------- */
const shippingFee  = sub => (sub >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST);

/* ---------- Validazione ---------------------------------------------- */
function isFormValid() {
  return REQUIRED_IDS.every(id => document.getElementById(id).value.trim()) &&
         document.getElementById("termsCheck").checked;
}
function togglePayBtn() {
  document.getElementById("checkout-btn").disabled = !isFormValid();
}

/* ---------- Riepilogo ------------------------------------------------- */
async function buildSummary() {
  try {
    const { costo_totale = 0 } = await fetchJSON("/api/orders/carrello");
    const sub  = parseFloat(costo_totale);
    const ship = shippingFee(sub);
    const tot  = sub + ship;

    document.querySelector(".subtotal-amount").textContent   = `€${sub.toFixed(2)}`;
    document.querySelector(".shipping-cost").textContent     = `€${ship.toFixed(2)}`;
    document.querySelectorAll(".total-amount").forEach(el =>
      el.textContent = `€${tot.toFixed(2)}`);

    // Nascondi la riga dello sconto (opzionale)
    const discountRow = document.querySelector(".shipping-discount")?.closest("li");
    if (discountRow) discountRow.style.display = "none";

  } catch {
    /* carrello vuoto → lascia 0,00 */
  }
}

/* ---------- DOM READY ------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {

  /* Tooltip Bootstrap */
  [...document.querySelectorAll("[data-bs-toggle='tooltip']")]
    .forEach(el => new bootstrap.Tooltip(el));

  /* Riepilogo iniziale */
  buildSummary();

  /* Live-validation campi */
  [...REQUIRED_IDS.map(id => document.getElementById(id)), document.getElementById("termsCheck")]
    .forEach(el => el.addEventListener("input", togglePayBtn));
  togglePayBtn();                                // stato iniziale

  /* Modal – codice transazione dinamico */
  document.getElementById("paymentConfirmationModal")
    .addEventListener("show.bs.modal", () => {
      const code = "SIM-" + Math.floor(Math.random() * 1_000_000);
      document.querySelector("#paymentConfirmationModal .text-muted")
              .textContent = "Codice transazione: " + code;
    });

  /* Bottone Completa ordine */
  document.getElementById("checkout-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    try {
      /* 1. ordine in carrello */
      const { ordine_id } = await fetchJSON("/api/orders/carrello");

      // Costruisci l’indirizzo concatenato dai campi form
      const indirizzo = [
        document.getElementById("address").value.trim(),
        document.getElementById("cap").value.trim(),
        document.getElementById("city").value.trim(),
        document.getElementById("province").value.trim(),
        document.getElementById("country").value.trim()
      ].filter(Boolean).join(", "); // esclude campi vuoti

      /* 2. patch stato */
      await fetchJSON(`/api/orders/${ordine_id}`, {
        method: "PATCH",
        body: JSON.stringify({ stato: "in spedizione", indirizzo_di_consegna: indirizzo })
      });

      /* 3. aggiorna riepilogo dentro al modal */
      await buildSummary();                     // totali aggiornati
      /* il modal si apre automaticamente */

    } catch (err) {
      alert(err.message.startsWith("HTTP 404")
        ? "Il carrello è vuoto."
        : "Errore durante il pagamento.");
    }
  });
  // Reindirizzamento a ordini.html dopo la chiusura del modal
document.getElementById("go-to-orders")?.addEventListener("click", () => {
  window.location.href = "/ordini.html";
});
});
