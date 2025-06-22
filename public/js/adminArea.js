/* --------------------------------------------------------------------------
 * adminArea.js – Dashboard Amministratore
 * -------------------------------------------------------------------------- */

/* ---------------- CONFIG ---------------- */
const API = {
  reports: '/api/report',
  orders:  '/api/orders',
  users:   '/api/users',
};

const TOKEN = localStorage.getItem('token');

/* ---------------- FETCH JSON Helper ---------------- */
async function fetchJSON(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------------- GLOBALS ---------------- */
let reports = [];
let usersMap = {};
let currentReportId = null;

/* ---------------- DAILY METRICS ---------------- */
async function loadDailyMetrics() {
  try {
    const data = await fetchJSON('/api/orders/daily-metrics');
    if (!Array.isArray(data) || !data.length) return;

    const row = data[0];                    // ← riga più recente

    document.getElementById('todayOrders').textContent =
      row.ordini ?? row.pezzi ?? 0;

    document.getElementById('todayRevenue').textContent =
      `€${parseFloat(row.fatturato).toFixed(2)}`;
  } catch (err) {
    console.error('Daily metrics error:', err);
  }
}

/* ---------------- DOM READY ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  if (!TOKEN) return location.replace('login.html');
  try {
    await Promise.all([
      loadUsers(),
      loadReports(),
      loadTopSellers(),
      loadDailyMetrics()
    ]);
  } catch (error) {
    console.error(error);
    alert('Errore nel caricamento dei dati');
  }
});

/* ---------------- LOGOUT ---------------- */
document.getElementById('logoutBtn')?.addEventListener('click', e => {
  e.preventDefault();                  // evita l'#'
  localStorage.removeItem('token');    // 👉  cancella il JWT
  window.location.replace('/index.html'); // o semplicemente '/' se l’index è root
});


// ricerca via click
document.getElementById('userSearchBtn')
        .addEventListener('click', searchUsers);

// ricerca con Enter
document.getElementById('userSearchInput')
        .addEventListener('keydown', e => {
          if (e.key === 'Enter') searchUsers();
        });

// delega per i pulsanti ban/sban (tabella risultati)
document.getElementById('userSearchResults')
        .addEventListener('click', e => {
          const btn = e.target.closest('.toggle-ban-btn');
          if (btn) toggleBan(btn);      // ⬅️ passa il pulsante, non l’evento
        });


/* ---------------- LOAD USERS ---------------- */
async function loadUsers() {
  const usersArray = await fetchJSON(API.users);
  usersMap = Object.fromEntries(usersArray.map(user => [user.id, user]));
}

/* ---------------- LOAD REPORTS ---------------- */
async function loadReports() {
  const rawReports = (await fetchJSON(API.reports))
        .filter(r => r.ordine_id && r.stato_segnalazione === 'in attesa');

  reports = await Promise.all(rawReports.map(async report => {
    const cliente = usersMap[report.cliente_id];
    let venditoreUsername = '?';
    let prodottoId = null;                  // 👈  lo inizializziamo

    try {
      /* 1) l’ordine ha sempre UN solo prodotto */
      const ordine   = await fetchJSON(`${API.orders}/${report.ordine_id}`);
      const prodotto = ordine.prodotti?.[0];

      if (prodotto) {
        prodottoId = prodotto.prodotto_id;  // 👉  salva l’id
        const prodDetail = await fetchJSON(`/api/products/${prodottoId}`);
        venditoreUsername = prodDetail.nome_artigiano || '-';
      }
    } catch (err) {
      console.warn('Errore reperimento venditore', err);
    }

    return {
      ...report,
      prodotto_id: prodottoId,              // ← ora c’è davvero
      cliente_username  : cliente?.nome_utente || report.cliente_id,
      venditore_username: venditoreUsername
    };
  }));

  updateStats();
  renderReportsTable();
}

/* ---------------- LOAD TOP SELLERS ---------------- */
async function loadTopSellers() {
  try {
    const top = await fetchJSON('/api/orders/top-sellers'); // ← restituisce TOP-5 dal backend

    // ───────── tabella principale: SOLO i primi 3
    const mainBody = document.getElementById('topSellersTableBody');
    mainBody.innerHTML = '';
    top.slice(0, 3).forEach((p, i) => {
      mainBody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${i + 1}</td>
          <td>${p.prodotto_id}</td>
          <td>${p.nome_prodotto}</td>
          <td>${p.nome_tipologia}</td> 
          <td>${p.totale_pezzi}</td>
          <td>€${parseFloat(p.fatturato).toFixed(2)}</td>
        </tr>
      `);
    });

    // ───────── modale “Vedi tutti”: elenco completo
    const modalBody = document.getElementById('allTopSellersTableBody');
    modalBody.innerHTML = '';
    top.forEach((p, i) => {
      modalBody.insertAdjacentHTML('beforeend', `
        <tr>
          <td>${i + 1}</td>
          <td>${p.prodotto_id}</td>
          <td>${p.nome_prodotto}</td>
          <td>${p.nome_tipologia}</td>                    <!-- se non hai la categoria -->
          <td>${p.totale_pezzi}</td>
          <td>€${parseFloat(p.fatturato).toFixed(2)}</td>
        </tr>
      `);
    });
  } catch (err) {
    console.error('Top seller load error:', err);
  }
}

/* ---------------- USER SEARCH ---------------- */
async function searchUsers() {
  const q = document.getElementById('userSearchInput').value.trim();
  if (!q) return;

  try {
    const users = await fetchJSON(`/api/users?q=${encodeURIComponent(q)}`);
    const tbody = document.getElementById('userSearchResults');
    tbody.innerHTML = '';

    users.forEach(u => {
      tbody.insertAdjacentHTML('beforeend', `
        <tr data-id="${u.id}" data-banned="${u.is_banned}">
          <td>${u.nome_utente}</td>
          <td>${u.nome} ${u.cognome}</td>
          <td>${u.email}</td>
          <td>
            <button class="btn btn-sm ${
              u.is_banned ? 'btn-success' : 'btn-danger'
            } toggle-ban-btn">
              <i class="fas ${u.is_banned ? 'fa-lock-open' : 'fa-lock'}"></i>
            </button>
          </td>
        </tr>
      `);
    });
  } catch (err) {
    console.error('User search error:', err);
    showToast('danger', 'Errore nella ricerca utenti');
  }
}

/* handler bottone Ban/Sban */
async function toggleBan(btn) {
  const tr        = btn.closest('tr');
  const id        = tr.dataset.id;
  const bannedNow = tr.dataset.banned === 'true';

  try {
    await fetchJSON(`/api/users/${id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ is_banned: !bannedNow })
    });

    // aggiorna dataset e interfaccia
    tr.dataset.banned = (!bannedNow).toString();
    btn.classList.toggle('btn-danger');
    btn.classList.toggle('btn-success');
    btn.innerHTML = `<i class="fas ${!bannedNow ? 'fa-lock' : 'fa-lock-open'}"></i>`;

    showToast('success', `Utente ${!bannedNow ? 'bannato' : 'sbannato'} con successo`);
  } catch (err) {
    console.error('Toggle ban error:', err);
    showToast('danger', 'Errore durante il ban/sban');
  }
}


/* ---------------- UPDATE DASHBOARD STATS ---------------- */
function updateStats() {
  const openReports = reports.filter(r => r.stato_segnalazione === 'in attesa').length;
  const counter = document.getElementById('todayReports');
  if (counter) counter.textContent = openReports;
}

/* ---------------- RENDER REPORTS ---------------- */
function renderReportsTable() {
  const recentTbody = document.getElementById('recentReportsTableBody');
  const allTbody = document.getElementById('allReportsTableBody');

  [recentTbody, allTbody].forEach(tbody => tbody.innerHTML = '');

  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.data_segnalazione) - new Date(a.data_segnalazione)
  );

  sortedReports.slice(0, 5).forEach(rep => insertReportRow(rep, recentTbody));
  sortedReports.forEach(rep => insertReportRow(rep, allTbody));

  document.querySelectorAll('.view-report-btn').forEach(btn =>
    btn.addEventListener('click', openReportModal)
  );
}

function insertReportRow(rep, tbody) {
  const row = `
    <tr>
      <td>${rep.segnalazione_id}</td>
      <td>${rep.motivazione}</td>
      <td>${rep.cliente_username}</td>
      <td>${rep.venditore_username}</td>
      <td>${new Date(rep.data_segnalazione).toLocaleDateString('it-IT')}</td>
      <td>
        <button class="btn btn-sm btn-outline-orange view-report-btn" data-id="${rep.segnalazione_id}">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>`;
  tbody.insertAdjacentHTML('beforeend', row);
}

/* ---------------- MODALE REPORT ---------------- */
function openReportModal() {
  currentReportId = this.dataset.id;
  const report = reports.find(r => r.segnalazione_id == currentReportId);
  if (!report) return;

  document.getElementById('reportId').textContent = report.segnalazione_id;
  document.getElementById('reportType').textContent = report.motivazione;
  document.getElementById('reportUser').textContent = report.cliente_username;
  document.getElementById('reportVendor').textContent = report.venditore_username;
  document.getElementById('reportDate').textContent = new Date(report.data_segnalazione).toLocaleDateString('it-IT');
  document.getElementById('reportProduct').textContent = report.prodotto_id;
  document.getElementById('reportOrder').textContent = report.ordine_id;
  document.getElementById('reportDescription').textContent = report.testo || '—';

  const textarea = document.getElementById('resolutionComment');
  if (textarea) textarea.value = '';

  showModal('viewReportModal');
}

document.getElementById('approveReportBtn')?.addEventListener('click', async () => {
  if (!currentReportId) return;
  const comment = document.getElementById('resolutionComment')?.value.trim() || 'Chiuso dall’admin';

  await fetchJSON(`${API.reports}/${currentReportId}/close`, {
    method: 'PATCH',
    body: JSON.stringify({ risoluzione: comment })
  });

  reports = reports.filter(r => r.segnalazione_id != currentReportId);
  updateStats();
  renderReportsTable();
  hideModal('viewReportModal');
  showToast('success', 'Segnalazione chiusa con successo');
});

/* ---------------- UI HELPERS ---------------- */
function showModal(id) {
  new bootstrap.Modal(document.getElementById(id)).show();
}

function hideModal(id) {
  bootstrap.Modal.getInstance(document.getElementById(id))?.hide();
}

function showToast(type, message) {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
  toast.style.zIndex = '1100';
  toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
