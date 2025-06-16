// form-animation.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const submitBtn = document.getElementById('myBTN');
    
    if (form && submitBtn) {
        form.addEventListener('submit', handleFormSubmit);
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('#myBTN');
        const originalBtnText = submitBtn.innerHTML;
        
        // Validazione del form
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        // Animazione e stato di caricamento
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Registrazione in corso...
        `;
        form.classList.add('form-submitting');
        
        // Simula l'invio dei dati (sostituire con chiamata API reale)
        simulateFormSubmission(form)
            .then(() => {
                // Reindirizzamento dopo il successo
                window.location.href = form.action;
            })
            .catch(error => {
                console.error('Registration error:', error);
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                form.classList.remove('form-submitting');
                showErrorAlert('Si è verificato un errore durante la registrazione. Riprova.');
            });
    }

    function simulateFormSubmission(form) {
        return new Promise((resolve, reject) => {
            // Simula un ritardo di rete (sostituire con fetch/axios)
            setTimeout(() => {
                // Simula un successo (nella realtà, verificare la risposta del server)
                const shouldFail = Math.random() < 0.1; // 10% di chance di errore per testing - cambiare a 100 per vedere il successo
                
                if (shouldFail) {
                    reject(new Error('Simulated server error'));
                } else {
                    resolve();
                }
            }, 1000);
        });
    }

    function showErrorAlert(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        const container = document.querySelector('.registrationForm') || form.parentNode;
        container.appendChild(alertDiv);
        
        // Rimuovi automaticamente dopo 5 secondi
        setTimeout(() => {
            const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
            alert.close();
        }, 5000);
    }
});