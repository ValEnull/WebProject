            document.querySelector('.myLogIn').addEventListener('submit', async function(e) {
            e.preventDefault();

            const nome_utente = document.getElementById('user').value;
            const password = document.getElementById('psw').value;

            try {
                const response = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome_utente, password })
                });

                const data = await response.json();

                if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('ruolo_id', data.user.ruolo_id);

                // 🔁 Reindirizzamento in base al ruolo
                switch (data.user.ruolo_id) {
                    case 1: // Cliente
                    window.location.href = 'index.html';
                    break;
                    case 2: // Artigiano
                    window.location.href = '/artigiano/dashboard.html';
                    break;
                    case 3: // Admin
                    window.location.href = '/admin/pannello.html';
                    break;
                    default:
                    alert('Ruolo sconosciuto');
                }

                } else {
                alert(data.message || 'Credenziali non valide');
                }
            } catch (error) {
                console.error('Errore nella richiesta:', error);
                alert('Errore di rete');
            }
            });