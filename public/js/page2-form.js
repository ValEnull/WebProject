document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    /* ── ❶ Pulisci eventuali sessioni residue ── */
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    /* ─────── Raccogli dati dal form ─────── */
    const data = Object.fromEntries(new FormData(form).entries());

    /* Fissa il ruolo artigiano + campi obbligatori */
    data.isArtigiano = true;        // back-end ⇒ ruolo_id = 2
    data.ruolo       = 'artigiano'; // facoltativo

    try {
      /* ─────── POST /register ─────── */
      const regRes = await fetch('http://localhost:5000/api/users/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });

      if (!regRes.ok) {
        const err = await regRes.json();
        alert('Registrazione fallita: ' + (err.error || 'errore sconosciuto'));
        return;
      }

      /* ── ❷ Cancella di nuovo token nel caso il back-end ne invii uno ── */
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      /* ─────── Successo ─────── */
      alert('Registrazione avvenuta con successo!');
      setTimeout(() => {
        window.location.href = 'page3-esito.html';   // nessun login automatico
      }, 300);

    } catch (err) {
      console.error('Errore di rete:', err);
      alert('Impossibile contattare il server. Riprova più tardi.');
    }
  });
});
