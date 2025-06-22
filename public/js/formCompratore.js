// /js/formCompratore.js
(() => {
  const form = document.querySelector('.myForm');
  if (!form) return;                      // la pagina non ha il form? esci.

  form.addEventListener('submit', async (e) => {
    e.preventDefault();                   // blocca il submit tradizionale

    // raccogli i dati
    const formData = {
      nome_utente:  document.getElementById('username').value.trim(),
      nome:         document.getElementById('name').value.trim(),
      cognome:      document.getElementById('surname').value.trim(),
      email:        document.getElementById('email').value.trim(),
      password:     document.getElementById('psw').value,
      password_confirmation: document.getElementById('pswConf').value,
      isArtigiano: false
    };

    // validazione client-side minima
    if (formData.password !== formData.password_confirmation) {
      alert('Le password non corrispondono!');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {                 // 4xx o 5xx
        const { error } = await response.json().catch(() => ({}));
        alert('Errore: ' + (error || response.statusText));
        return;
      }

      // ✅ tutto ok
      alert('Registrazione avvenuta con successo!');
      // se index.html è nella root del tuo server statico
      window.location.replace('/index.html'); // oppure window.location.assign('/');

    } catch (err) {
      console.error(err);
      alert('Si è verificato un errore durante la comunicazione con il server');
    }
  });
})();