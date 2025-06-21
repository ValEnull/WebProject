let token = null;
let companyData = null;

/* ────────────────────────────────────────────
   Decodifica JWT
──────────────────────────────────────────── */
function parseJwt(jwt) {
  try {
    const base64Url = jwt.split('.')[1];
    const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json      = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch (e) {
    console.error('Token non valido:', e);
    return null;
  }
}

/* ────────────────────────────────────────────
   Logout helper
──────────────────────────────────────────── */
function logout(redirect = '/login.html') {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  window.location.replace(redirect);
}

/* ────────────────────────────────────────────
   Verifica validità token
──────────────────────────────────────────── */
function verificaToken() {
  const raw = localStorage.getItem('token');
  if (!raw) return logout();

  const dec = parseJwt(raw);
  if (!dec) return logout();

  const now = Math.floor(Date.now() / 1000);
  if (dec.exp && dec.exp < now) return logout();
}

/* ────────────────────────────────────────────
   Popola la UI
──────────────────────────────────────────── */
function populateCompanyData(d) {
  const nome  = d.nome_azienda || 'Azienda';
  const piva  = d.p_iva        || 'N/A';
  const email = d.email        || 'N/A';

  // visual
  document.querySelectorAll('#nomeAzienda, #nomeAziendaDisplay').forEach(el => (el.textContent = nome));
  const pivaDisp  = document.getElementById('pivaDisplay');
  const emailDisp = document.getElementById('emailDisplay');
  if (pivaDisp)  pivaDisp.textContent  = piva;
  if (emailDisp) emailDisp.textContent = email;

  // modale
  const nomeInput  = document.getElementById('nomeAzienda');
  const pivaInput  = document.getElementById('piva');
  const emailInput = document.getElementById('email');
  if (nomeInput)  nomeInput.value  = nome;
  if (pivaInput)  pivaInput.value  = piva;
  if (emailInput) emailInput.value = email;
}

/* ────────────────────────────────────────────
   Main
──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  verificaToken();

  token       = localStorage.getItem('token');
  companyData = parseJwt(token);

  /* fetch dati artigiano */
  fetch(`/api/users/artisans/${companyData.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => { if (!r.ok) throw new Error('fetch company'); return r.json(); })
    .then(populateCompanyData)
    .catch(err => { console.error(err); alert('Impossibile caricare i dati aziendali.'); });

  /* logout */
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', e => {
      e.preventDefault();
      logout('/index.html');
    });
  }

  /* salva info azienda */
  document.getElementById('salvaInfoAzienda').addEventListener('click', async () => {
    const body = {
      nome_azienda: document.getElementById('nomeAzienda').value,
      p_iva:        document.getElementById('piva').value
    };

    try {
      const res = await fetch(`/api/users/${companyData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (res.ok) { alert('Aggiornato!'); location.reload(); }
      else        { alert('Errore aggiornamento.'); }
    } catch (err) {
      console.error(err); alert('Errore di rete.');
    }
  });

  /* salva contatti */
  document.getElementById('salvaContatti').addEventListener('click', async () => {
    const body = { email: document.getElementById('email').value };

    try {
      const res = await fetch(`/api/users/${companyData.id}/contacts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (res.ok) { alert('Email aggiornata!'); location.reload(); }
      else        { alert('Errore aggiornamento email.'); }
    } catch (err) {
      console.error(err); alert('Errore di rete.');
    }
  });

    // Cambia password
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword     = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        return alert('Le password non coincidono.');
    }

    try {
        const res = await fetch(`/api/users/${companyData.id}/password`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            oldPassword: currentPassword,   // 👈 chiavi corrette
            newPassword: newPassword
        })
        });

        if (res.ok) {
        alert('Password aggiornata con successo!');
        e.target.reset();
        } else {
        const data = await res.json();
        alert(data.error || 'Errore nel cambiamento della password');
        }
    } catch (err) {
        console.error('Errore aggiornamento password:', err);
        alert('Errore di rete o del server.');
    }
    });
    
  /* elimina account */
  document.getElementById('deleteAccountForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pwd = document.getElementById('currentPasswordDelete').value;
    const txt = document.getElementById('confirmDelete').value;

    if (txt !== 'ELIMINA AZIENDA') return alert('Conferma non valida');
    if (!confirm('Eliminare definitivamente?')) return;

    try {
      const res = await fetch(`/api/users/${companyData.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pwd })
      });

      if (res.ok) { alert('Account eliminato'); logout(); }
      else        { const d = await res.json(); alert(d.error || 'Errore.'); }
    } catch (err) {
      console.error(err); alert('Errore di rete.');
    }
  });
});

/* verifica token anche su ritorno da bfcache */
window.addEventListener('pageshow', verificaToken);
