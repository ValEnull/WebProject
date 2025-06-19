// Global scope variables to hold token and companyData
let token = null;
let companyData = null;

// Decode JWT token and return company data
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

// Populate UI fields with company data
function populateCompanyData(companyData) {
    const nomeAzienda = companyData.nome_azienda || 'Azienda';
    const piva = companyData.piva || 'N/A';
    const indirizzo = companyData.indirizzo || 'N/A';
    const email = companyData.email || 'N/A';
    const telefono = companyData.telefono || 'N/A';
    const intestatarioConto = companyData.intestatario_conto || 'N/A';
    const iban = companyData.iban || 'N/A';

    // Update display fields
    document.querySelectorAll('#nomeAzienda, #nomeAziendaDisplay').forEach(el => el.textContent = nomeAzienda);
    document.getElementById('pivaDisplay').textContent = piva;
    document.getElementById('indirizzoDisplay').textContent = indirizzo;
    document.getElementById('emailDisplay').textContent = email;
    document.getElementById('telefonoDisplay').textContent = telefono;
    document.getElementById('intestatarioContoDisplay').textContent = intestatarioConto;
    document.getElementById('ibanDisplay').textContent = iban;

    // Update form fields
    document.getElementById('nomeAzienda').value = nomeAzienda;
    document.getElementById('piva').value = piva;
    document.getElementById('indirizzo').value = indirizzo;
    document.getElementById('email').value = email;
    document.getElementById('telefono').value = telefono;
    document.getElementById('intestatarioConto').value = intestatarioConto;
    document.getElementById('iban').value = iban;
}

// Initialize after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    token = localStorage.getItem('token');
    if (!token) {
        logout();
        return;
    }

    companyData = parseJwt(token);
    if (!companyData) {
        logout();
        return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (companyData.exp && companyData.exp < now) {
        console.warn("Token scaduto");
        logout();
        return;
    }

    // Fetch complete company data from API
    fetch(`/api/companies/${companyData.id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to fetch company data');
        return res.json();
    })
    .then(data => {
        populateCompanyData(data);
    })
    .catch(err => {
        console.error(err);
        alert('Impossibile caricare i dati aziendali.');
    });

    // Info Azienda Form
    document.getElementById('salvaInfoAzienda').addEventListener('click', async () => {
        const formData = {
            nome_azienda: document.getElementById('nomeAzienda').value,
            piva: document.getElementById('piva').value,
            indirizzo: document.getElementById('indirizzo').value
        };

        try {
            const response = await fetch(`/api/companies/${companyData.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert("Informazioni aziendali aggiornate con successo!");
                location.reload();
            } else {
                alert("Errore nell'aggiornamento delle informazioni aziendali.");
            }
        } catch (error) {
            console.error("Errore aggiornamento informazioni aziendali:", error);
            alert("Si è verificato un errore durante la richiesta.");
        }
    });

    // Contatti Form
    document.getElementById('salvaContatti').addEventListener('click', async () => {
        const formData = {
            email: document.getElementById('email').value,
            telefono: document.getElementById('telefono').value
        };

        try {
            const response = await fetch(`/api/companies/${companyData.id}/contacts`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert("Contatti aggiornati con successo!");
                location.reload();
            } else {
                alert("Errore nell'aggiornamento dei contatti.");
            }
        } catch (error) {
            console.error("Errore aggiornamento contatti:", error);
            alert("Si è verificato un errore durante la richiesta.");
        }
    });

    // Bancarie Form
    document.getElementById('salvaBancarie').addEventListener('click', async () => {
        const formData = {
            intestatario_conto: document.getElementById('intestatarioConto').value,
            iban: document.getElementById('iban').value
        };

        try {
            const response = await fetch(`/api/companies/${companyData.id}/bank`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert("Informazioni bancarie aggiornate con successo!");
                location.reload();
            } else {
                alert("Errore nell'aggiornamento delle informazioni bancarie.");
            }
        } catch (error) {
            console.error("Errore aggiornamento informazioni bancarie:", error);
            alert("Si è verificato un errore durante la richiesta.");
        }
    });

    // Password Form
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            return alert("Le password non coincidono.");
        }

        try {
            const response = await fetch(`/api/companies/${companyData.id}/password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (response.ok) {
                alert("Password aggiornata con successo!");
                document.getElementById('passwordForm').reset();
            } else {
                const data = await response.json();
                alert(data.error || "Errore nel cambiamento della password");
            }
        } catch (error) {
            console.error("Errore aggiornamento password:", error);
            alert("Si è verificato un errore durante la richiesta.");
        }
    });

    // Delete Account Form
    document.getElementById('deleteAccountForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('currentPasswordDelete').value;
        const confirmText = document.getElementById('confirmDelete').value;

        if (confirmText !== "ELIMINA AZIENDA") {
            return alert("Conferma non valida");
        }

        if (!confirm("Sei sicuro di voler eliminare definitivamente l'account aziendale?")) {
            return;
        }

        try {
            const response = await fetch(`/api/companies/${companyData.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                alert("Account aziendale eliminato");
                logout();
            } else {
                const data = await response.json();
                alert(data.error || "Errore nell'eliminazione");
            }
        } catch (error) {
            console.error("Errore eliminazione account aziendale:", error);
            alert("Si è verificato un errore durante la richiesta.");
        }
    });
});