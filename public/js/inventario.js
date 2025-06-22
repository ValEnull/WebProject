/* --------------------------------------------------------------------- */
/*  inventario.js  – FIX barra ricerca + guard form fantasma             */
/* --------------------------------------------------------------------- */

let token = null;
let user  = null;
let products = [];

/* ── Helpers JWT + logout ──────────────────────────────────────────── */
function parseJwt (jwt) {
  try {
    const base64Url = jwt.split('.')[1];
    const json = atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch { return null; }
}
function logout (redirect = '/login.html') {
  localStorage.removeItem('token');
  window.location.replace(redirect);
}
function verificaToken () {
  const raw = localStorage.getItem('token');
  if (!raw) return logout();
  const dec = parseJwt(raw);
  if (!dec) return logout();
  if (dec.exp && dec.exp < Date.now() / 1000) return logout();
  token = raw;
  user  = dec;
}

/* ── API call: prodotti dell’artigiano ─────────────────────────────── */
async function fetchProducts () {
  try {
    const res = await fetch(`/api/products/artigiano/${user.id}?limit=1000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('fetch products');
    const data = await res.json();
    products = data.prodotti || data;   // a seconda della forma risposta
  } catch (err) {
    console.error(err);
    alert('Errore nel caricamento prodotti.');
  }
}

/* ── UI helpers ────────────────────────────────────────────────────── */
function badgeFor (status, quant) {
  if (quant === 0) return `<span class="badge bg-inactive">Esaurito</span>`;
  if (quant <= 5)  return `<span class="badge bg-low-stock">Basso stock</span>`;
  return `<span class="badge bg-active">Disponibile</span>`;
}

function loadStats () {
  const stats = [
    { t: 'Prodotti totali', v: products.length },
    { t: 'Disponibili',     v: products.filter(p => p.quant > 5).length },
    { t: 'In esaurimento',  v: products.filter(p => p.quant > 0 && p.quant <= 5).length },
    { t: 'Esauriti',        v: products.filter(p => p.quant === 0).length }
  ];
  const c = document.querySelector('.stats-container');
  c.innerHTML = '';
  stats.forEach(s => {
    c.insertAdjacentHTML('beforeend', `
      <div class="col-md-3 mb-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body text-center">
            <h5 class="text-muted mb-2">${s.t}</h5>
            <h2 class="text-orange">${s.v}</h2>
          </div>
        </div>
      </div>`);
  });
}

function loadTable (filtered = products) {
  const body = document.querySelector('.products-body');
  body.innerHTML = '';
  filtered.forEach(p => {
    body.insertAdjacentHTML('beforeend', `
      <tr>
        <td><img src="data:image/jpeg;base64,${p.immagine_principale || ''}" 
                 onerror="this.src='/img/placeholderProduct.png'" 
                 class="product-table-img"></td>
        <td>${p.nome_prodotto}</td>
        <td>${p.prodotto_id}</td>
        <td>${p.quant}</td>
        <td>€${Number(p.prezzo).toFixed(2)}</td>
        <td>${badgeFor(p.status, p.quant)}</td>
        <td>
          <a href="editProduct.html?id=${p.prodotto_id}" 
             class="btn btn-sm btn-outline-orange" title="Modifica">
            <i class="fas fa-edit"></i>
          </a>
        </td>
      </tr>`);
  });
  const badge = document.querySelector('.card-header span.badge');
  if (badge) badge.textContent = `${filtered.length} prodotti`;
}

/* ── Search con bottone + invio ─────────────────────────────────────── */
function setupSearch () {
  const input  = document.getElementById('searchInput') ||
                 document.querySelector('.input-group input');
  const button = document.querySelector('.search-btn');

  if (!input || !button) return;  // markup mancante? esci

  const doSearch = () => {
    const q = input.value.toLowerCase().trim();
    const isNumeric     = /^\d+$/.test(q);
    const filterEnabled = (isNumeric ? q.length >= 2 : q.length >= 1);

    const filtrati = !filterEnabled ? products : products.filter(p =>
      p.nome_prodotto.toLowerCase().includes(q) ||
      (p.descrizione || '').toLowerCase().includes(q) ||
      String(p.prodotto_id).includes(q)
    );

    loadTable(filtrati);
  };

  button.addEventListener('click', doSearch);
  input.addEventListener('keyup', e => { if (e.key === 'Enter') doSearch(); });
}


/* ── Logout link ───────────────────────────────────────────────────── */
function attachLogout () {
  const b = document.getElementById('logout-btn');
  if (b) b.addEventListener('click', e => { e.preventDefault(); logout('/index.html'); });
}

/* ── Init ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  verificaToken();          // imposta token e user or logout
  attachLogout();           // logout handler

  await fetchProducts();    // carica prodotti dal backend
  loadStats();
  loadTable();
  setupSearch();            // attiva ricerca live
});

/* back-forward cache */
window.addEventListener('pageshow', verificaToken);

/* ── Codice legacy "aggiungi prodotto" – eseguilo solo se il form esiste */
document.addEventListener('DOMContentLoaded', () => {
  const form  = document.getElementById('addProductForm');
  if (!form) return;  // se la pagina non ha il form, interrompi qui

  const token = localStorage.getItem('token');
  const user  = token ? JSON.parse(atob(token.split('.')[1])) : null;

  if (!token || !user) {
    localStorage.removeItem('token');
    return window.location.href = '/login.html';
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const body = {
      nome_prodotto: document.getElementById('nome').value,
      descrizione:   document.getElementById('descrizione').value,
      quant:         parseInt(document.getElementById('quantita').value, 10),
      prezzo:        parseFloat(document.getElementById('prezzo').value),
      tipologia_id:  parseInt(document.getElementById('tipologia').value, 10),
      artigiano_id:  user.id
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert('Prodotto aggiunto con successo!');
        window.location.href = 'inventario.html';
      } else {
        const d = await res.json();
        alert(d.error || 'Errore durante l\u2019aggiunta del prodotto');
      }
    } catch (err) {
      console.error(err);
      alert('Errore di rete.');
    }
  });
});