/**************************************************************************
 * ordini.js – lista ordini utente con “Ricevuto” + Segnalazione
 **************************************************************************/

/* ----------------- helper fetch -------------------------------------- */
async function fetchJSON(url, opts = {}) {
  const token   = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(opts?.headers||{}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ----------------- login-guard + logout ------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("token")) return location.replace("login.html");
  document.getElementById("logout-btn")
    ?.addEventListener("click", e => { e.preventDefault(); localStorage.removeItem("token"); location.replace("login.html"); });

  loadOrders();
});

/* ----------------- caricamento ordini -------------------------------- */
async function loadOrders() {
  const wrap = document.getElementById("ordini-container");
  wrap.innerHTML = '<div class="text-center my-5"><div class="spinner-border"></div></div>';

  try {
    /* 1. elenco ordini (senza carrello) */
    const elenco = await fetchJSON("/api/orders/storico");        // [{ ordine_id, data_ordine, stato }]
    if (!elenco.length) {
      wrap.innerHTML = `<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>Non hai ancora effettuato ordini</div>`;
      return;
    }

    /* 2. dettagli in parallelo */
    const dettagli = await Promise.all(
      elenco.map(o => fetchJSON(`/api/orders/${o.ordine_id}`))    // aggiunge prodotti, totale…
    );

    wrap.innerHTML = dettagli.map(renderOrderCard).join("");
    /* attach handler dopo il render */
    wrap.querySelectorAll(".btn-ricevuto").forEach(btn => btn.addEventListener("click", segnaRicevuto));
    wrap.querySelectorAll(".btn-report").forEach(btn => btn.addEventListener("click", apriReportModal));

  } catch (err) {
    console.error(err);
    wrap.innerHTML = `<div class="alert alert-danger">Errore nel caricamento ordini.</div>`;
  }
}

/* ----------------- renderer card ------------------------------------- */
const statoText  = { "in spedizione":"In spedizione", "concluso":"Consegnato", "in controversia":"In controversia" };
const statoClass = { "in spedizione":"bg-primary",    "concluso":"bg-success", "in controversia":"bg-warning text-dark" };

function renderOrderCard(o) {
  return /* html */`
  <div class="ordine-card mb-4" data-id="${o.ordine_id}">
    <div class="ordine-header d-flex justify-content-between align-items-baseline">
      <div>
        <span class="fw-semibold">Ordine #${o.ordine_id}</span>
        <span class="text-muted ms-2">${new Date(o.data_ordine).toLocaleDateString("it-IT")}</span>
      </div>
      <span class="badge ${statoClass[o.stato]||"bg-secondary"}">${statoText[o.stato]||o.stato}</span>
    </div>

    <div class="ordine-prodotti my-3">
      ${o.prodotti.map(p => `
        <div class="d-flex align-items-center mb-2">
          <img src="${p.immagine_principale ? `data:image/png;base64,${p.immagine_principale}` : "/img/placeholderProduct.png"}"
               class="me-2 rounded" style="width:60px;height:60px;object-fit:cover;">
          <div class="flex-grow-1">
            <div>${p.nome_prodotto}</div>
            <small class="text-muted">Quantità: ${p.quantita}</small>
          </div>
          <div class="fw-semibold">€ ${parseFloat(p.totale).toFixed(2)}</div>
        </div>`).join("")}
    </div>

    <div class="ordine-footer d-flex justify-content-between align-items-center border-top pt-3">
      <div><strong>Totale:</strong> € ${o.costo_totale}</div>
      <div class="d-flex gap-2">
        ${o.stato === "in spedizione" ? `
          <button class="btn btn-sm btn-outline-success btn-ricevuto">Segna come ricevuto</button>
          <button class="btn btn-sm btn-outline-danger btn-report">Segnala problema</button>
        ` : ""}
        ${o.stato === "in controversia" ? '<span class="text-danger small">Segnalazione aperta</span>' : ""}
      </div>
    </div>
  </div>`;
}

/* ----------------- segna come ricevuto ------------------------------- */
async function segnaRicevuto(e) {
  const card = e.target.closest(".ordine-card");
  const id   = card.dataset.id;
  e.target.disabled = true;

  try {
    await fetchJSON(`/api/orders/${id}`, {
      method:"PATCH",
      body: JSON.stringify({ stato:"concluso" })
    });
    card.querySelector(".badge").className = "badge bg-success";
    card.querySelector(".badge").textContent = "Consegnato";
    card.querySelector(".btn-report")?.remove();
    e.target.remove();
  } catch {
    alert("Errore aggiornamento ordine.");
    e.target.disabled = false;
  }
}

/* ----------------- segnalazione ordine --------------------------------*/
function apriReportModal(e) {
  const id = e.target.closest(".ordine-card").dataset.id;
  document.getElementById("report-order-id").value = id;
  document.getElementById("report-reason").value = "";
  document.getElementById("report-text").value   = "";
  bootstrap.Modal.getOrCreateInstance("#reportModal").show();
}

/* submit segnalazione */
document.getElementById("report-form").addEventListener("submit", async e => {
  e.preventDefault();
  const ordine_id = document.getElementById("report-order-id").value;
  const motivazione = document.getElementById("report-reason").value;
  const testo       = document.getElementById("report-text").value;

  if (!motivazione) return alert("Seleziona una motivazione.");

  try {
    await fetchJSON(`/api/report/${ordine_id}`, {
      method:"POST",
      body: JSON.stringify({ motivazione, testo })
    });
    alert("Segnalazione inviata!");          // puoi sostituire con toast
    bootstrap.Modal.getInstance("#reportModal").hide();
    loadOrders();                            // ricarica per mostrare stato "in controversia"
  } catch (err) {
    alert(err.message.startsWith("HTTP 403")
      ? "Non puoi segnalare questo ordine."
      : "Errore invio segnalazione.");
  }
});
