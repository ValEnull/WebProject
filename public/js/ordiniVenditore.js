/* ordiniVenditore.js – versione live --------------------------------- */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const orders = await fetchVendorOrders();        // ① API
    renderStats(orders);                             // ② cards statistiche
    renderOrdersTable(orders);                       // ③ tabella
    setupFilters(orders);                            // ④ filtri & ricerca
  } catch (e) {
    console.error(e);
    alert('Impossibile caricare gli ordini dal server.');
  }
}

/* ------------------------- API & trasformazioni -------------------- */

async function fetchVendorOrders() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/orders/venditore', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();

  return raw.map(r => ({
    id:         `SC-${String(r.ordine_id).padStart(6, '0')}`,
    dateISO:    r.data_ordine,
    date:       new Date(r.data_ordine).toLocaleDateString('it-IT'),
    pieces:     parseInt(r.tot_pezzi, 10),
    amount:     parseFloat(r.tot_importo),
    address:    r.indirizzo_di_consegna,
    statusKey:  dbStateToKey(r.stato)
  }));
}

function dbStateToKey(stato) {
  switch (stato) {
    case 'non pagato':     return 'processing';
    case 'in spedizione':  return 'shipped';
    case 'concluso':       return 'completed';
    case 'in controversia':return 'disputed';
    default:               return 'processing';
  }
}

/* ----------------------------- RENDER ------------------------------ */

function renderStats(list) {
  const stats = [
    { title: 'Ordini totali',   value: list.length },
    { title: 'In elaborazione', value: list.filter(o => o.statusKey === 'processing').length },
    { title: 'In spedizione',   value: list.filter(o => o.statusKey === 'shipped').length },
    { title: 'Completati',      value: list.filter(o => o.statusKey === 'completed').length }
  ];

  const wrap = document.querySelector('.stats-container');
  wrap.innerHTML = '';
  stats.forEach(s =>
    wrap.insertAdjacentHTML('beforeend', `
      <div class="col-md-3 mb-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body text-center">
            <h5 class="text-muted mb-2">${s.title}</h5>
            <h2 class="text-orange">${s.value}</h2>
          </div>
        </div>
      </div>`));
}

function renderOrdersTable(list, filter = 'all', search = '') {
  const tbody = document.querySelector('.orders-body');
  tbody.innerHTML = '';

  const rows = list
    .filter(o => filter === 'all' || o.statusKey === filter)
    .filter(o =>
      o.id.toLowerCase().includes(search) ||
      o.date.toLowerCase().includes(search) ||
      o.address.toLowerCase().includes(search));

  rows.forEach(o => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${o.id}</td>
        <td>${o.date}</td>
        <td>${o.pieces}</td>
        <td>€${o.amount.toFixed(2)}</td>
        <td class="small">${o.address}</td>
        <td><span class="badge bg-${o.statusKey}">
              ${keyToLabel(o.statusKey)}</span></td>
      </tr>`);
  });

  document.querySelector('.pagination-container')
          .innerHTML = `<span class="small text-muted">Totale record: ${rows.length}</span>`;
}

function keyToLabel(k) {
  return {
    processing: 'In elaborazione',
    shipped:    'In spedizione',
    completed:  'Completato',
    disputed:   'In controversia'
  }[k] || k;
}

/* --------------------------- FILTRI UI ----------------------------- */

function setupFilters(list) {
  // filtro per stato
  document.querySelectorAll('.filter-option').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.filter-option').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      const status = a.dataset.status;
      const term   = document.querySelector('.search-input').value.trim().toLowerCase();
      renderOrdersTable(list, status, term);
    });
  });

  // ricerca libera
  const input  = document.querySelector('.search-input');
  const button = document.querySelector('.search-btn');
  button.addEventListener('click', () => {
    const status = document.querySelector('.filter-option.active').dataset.status;
    renderOrdersTable(list, status, input.value.trim().toLowerCase());
  });
  input.addEventListener('keyup', e => {
    if (e.key === 'Enter') button.click();
  });
}
