document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetForm');
  if (!form) return;
  
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;

    try {
      const res = await fetch('http://localhost:5000/api/users/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Errore: ${error.error || 'Impossibile inviare la mail'}`);
        return;
      }

      const data = await res.json();
      alert(data.message || 'Email inviata!');
    } catch (err) {
      console.error('Errore chiamata API:', err);
      alert('Errore di rete. Riprova più tardi.');
    }
  });
});