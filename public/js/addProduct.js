document.addEventListener('DOMContentLoaded', function() {
    // Elementi del DOM
    const productForm = document.getElementById('productForm');
    const cancelButton = document.getElementById('cancelButton');
    const backToInventory = document.getElementById('backToInventory');
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    const successMessage = document.querySelector('#successModal h5');
    const submitButton = document.querySelector('#productForm button[type="submit"]');

    // Determina se siamo in modalità modifica o aggiunta
    const isEditPage = window.location.pathname.includes('editProduct.html');

    // Personalizza l'interfaccia in base alla pagina
    if (isEditPage) {
        if (submitButton) submitButton.textContent = 'Modifica Prodotto';
        if (successMessage) successMessage.textContent = 'Prodotto modificato correttamente!';
        
        // Qui potresti anche aggiungere la logica per precompilare il form
        // con i dati del prodotto esistente
    }

    // Gestione del pulsante Annulla
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            if (confirm('Sei sicuro di voler annullare? Tutte le modifiche andranno perse.')) {
                window.location.href = 'inventario.html';
            }
        });
    }

    // Gestione del submit del form
    if (productForm) {
        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!validateForm()) {
                return;
            }
            
            simulateServerRequest()
                .then(() => {
                    successModal.show();
                })
                .catch(error => {
                    console.error('Errore:', error);
                    alert(`Si è verificato un errore durante ${isEditPage ? 'la modifica' : 'il salvataggio'} del prodotto.`);
                });
        });
    }

    // Gestione del pulsante "Torna all'Inventario" nel modal
    if (backToInventory) {
        backToInventory.addEventListener('click', function() {
            window.location.href = 'inventario.html';
        });
    }

    // Funzione di validazione del form
    function validateForm() {
        const price = parseFloat(document.getElementById('price').value);
        const quantity = parseInt(document.getElementById('quantity').value);
        
        if (price <= 0) {
            alert('Il prezzo deve essere maggiore di 0');
            return false;
        }
        
        if (quantity < 0) {
            alert('La quantità non può essere negativa');
            return false;
        }
        
        return true;
    }

    // Funzione per simulare una richiesta al server
    function simulateServerRequest() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 1000);
        });
    }
});