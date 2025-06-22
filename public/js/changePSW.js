document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('changePasswordForm');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    alert('Link non valido o mancante.');
    form.style.display = 'none';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (newPassword !== confirmPassword) {
      alert('Le password non corrispondono.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Errore durante il cambio password.');
        return;
      }

      alert('✅ Password aggiornata con successo!');
      window.location.href = '/login.html';
    } catch (err) {
      console.error('Errore rete:', err);
      alert('Errore di rete. Riprova più tardi.');
    }
  });
});
