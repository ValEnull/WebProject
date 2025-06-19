// Global scope variables to hold token and userData
let token = null;
let userData = null;

// Decode JWT token and return user data
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Token non valido:', e);
        return null;
    }
}

// Logout function, removes token and redirects to login page
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Populate UI fields with user data
function populateUserData(userData) {
    const nomeUtente = userData.nome_utente || 'Utente';
    const nomeCompleto = `${userData.nome || ''} ${userData.cognome || ''}`.trim();
    const email = userData.email || 'N/A';

    const selectors = {
        'h1 span.text-orange': nomeUtente,
        '.card-body div.bg-light:nth-of-type(1)': nomeUtente,
        '.card-body .mb-3:nth-of-type(2) .bg-light': nomeCompleto,
        '#emailDisplay': email,
    };

    for (const [selector, text] of Object.entries(selectors)) {
        const el = document.querySelector(selector);
        if (el) el.textContent = text;
        else console.warn(`Elemento non trovato: ${selector}`);
    }

    const inputs = {
        'currentUsername': nomeUtente,
        'fullName': nomeCompleto,
        'emailDisplay' :email,
        'currentEmail': email,
    };

    for (const [id, value] of Object.entries(inputs)) {
        const input = document.getElementById(id);
        if (input) input.value = value;
        else console.warn(`Input non trovato: ${id}`);
    }
}

// Initialize after DOM content is loaded
window.addEventListener('DOMContentLoaded', () => {
    token = localStorage.getItem('token');
    if (!token) {
        logout();
        return;
    }

    userData = parseJwt(token);
    if (!userData) {
        logout();
        return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (userData.exp && userData.exp < now) {
        console.warn("Token scaduto");
        logout();
        return;
    }

    populateUserData(userData);

    document.addEventListener('DOMContentLoaded', () => {
  const userId = localStorage.getItem('userId'); // or get it however you store user info
  const token = localStorage.getItem('token');

  if (!userId || !token) {
    console.warn('User not logged in');
    return;
  }

  fetch(`/api/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch user data');
      return res.json();
    })
    .then(user => {
      // Update the email on the page
      const emailDisplay = document.querySelector('#emailDisplay');
      const emailDiv = document.querySelector('#emailDisplay');
      const currentEmailInput = document.querySelector('#currentEmail');
     
      if (emailDisplay) emailDisplay.textContent = user.email;
      if (emailDiv) emailDiv.textContent = user.email;
      if (currentEmailInput) currentEmailInput.value = user.email;

      // Similarly update username and full name if you want
      const usernameDiv = document.querySelector('#usernameDisplay');
      if (usernameDiv) usernameDiv.textContent = user.username;

      const fullNameInput = document.querySelector('#fullName');
      if (fullNameInput) fullNameInput.value = user.fullName;
    })
    .catch(err => {
      console.error(err);
      alert('Impossibile caricare i dati utente.');
    });
});

    // Register event listeners here, so userData and token are available

    // Modifica e-mail
    const emailModalBtn = document.querySelector('#emailModal .btn.btn-orange');
    if (emailModalBtn) {
        emailModalBtn.addEventListener('click', async () => {
            if (!userData || !token) {
                alert("Utente non autenticato");
                logout();
                return;
            }
            const newEmail = document.getElementById('newEmail').value;
            const confirmEmail = document.getElementById('confirmEmail').value;

            if (newEmail !== confirmEmail) {
                return alert("Le email non coincidono.");
            }

            try {
                const response = await fetch(`/api/users/${userData.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ email: newEmail })
                });

                if (response.ok) {
                    alert("Email aggiornata con successo!");
                    location.reload();
                } else {
                    alert("Errore nell'aggiornamento dell'email.");
                }
            } catch (error) {
                console.error("Errore aggiornamento email:", error);
                alert("Si è verificato un errore durante la richiesta.");
            }
        });
    }

//modifica password
//modifica dati anagrafici



    // Elimina account
    const deleteForm = document.getElementById('deleteAccountForm');
    if (deleteForm) {
        deleteForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!userData || !token) {
                alert("Utente non autenticato");
                logout();
                return;
            }

            const password = document.getElementById('currentPasswordDelete').value;
            const confirmText = document.getElementById('confirmDelete').value;

            if (confirmText !== "ELIMINA ACCOUNT") {
                return alert("Conferma non valida");
            }

            try {
                const response = await fetch(`/api/users/${userData.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ password })
                });

                if (response.ok) {
                    alert("Account eliminato");
                    logout();
                } else {
                    const data = await response.json();
                    alert(data.error || "Errore nell'eliminazione");
                }
            } catch (error) {
                console.error("Errore eliminazione account:", error);
                alert("Si è verificato un errore durante la richiesta.");
            }
        });
    }
});
