function handleFormSubmission() {
    const form = document.querySelector('.myForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = {
            nome_utente: document.getElementById('username').value,
            nome: document.getElementById('name').value,
            cognome: document.getElementById('surname').value,
            email: document.getElementById('email').value,
            password: document.getElementById('psw').value,
            password_confirmation: document.getElementById('pswConf').value,
            roulo_id: 1
        };

        if (formData.password !== formData.password_confirmation) {
            alert('Le password non corrispondono!');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert('Errore: ' + (errorData.message || response.statusText));
                return;
            }

            alert('Registrazione avvenuta con successo!');
            // Esempio: form.reset() o redirect
        } catch (error) {
            console.error('Error:', error);
            alert('Si è verificato un errore durante la comunicazione con il server');
        }
    });
}

// Inizializzazione dopo che il DOM è pronto
document.addEventListener('DOMContentLoaded', handleFormSubmission);
