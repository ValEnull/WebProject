document.addEventListener('DOMContentLoaded', function() {
    // Inizializza i tooltip di Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Variabile per memorizzare l'ID della recensione corrente
    let currentReviewId = null;

    // Gestione visualizzazione recensioni
    const viewReviewButtons = document.querySelectorAll('.view-review-btn');
    viewReviewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Popola il modal con i dati della recensione
            const product = this.getAttribute('data-product');
            const user = this.getAttribute('data-user');
            const date = this.getAttribute('data-date');
            currentReviewId = this.getAttribute('data-id');
            const text = this.getAttribute('data-text');
            const reason = this.getAttribute('data-reason');
            const rating = parseInt(this.getAttribute('data-rating'));

            document.getElementById('reviewProduct').textContent = product;
            document.getElementById('reviewUser').textContent = user;
            document.getElementById('reviewDate').textContent = date;
            document.getElementById('reviewId').textContent = currentReviewId;
            document.getElementById('reviewText').textContent = text;
            document.getElementById('reportReason').textContent = reason || 'Nessun motivo specificato';
            
            // Aggiorna le stelle della valutazione
            const starsContainer = document.getElementById('reviewRating');
            starsContainer.innerHTML = '';
            
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                star.className = i <= rating ? 'fas fa-star' : 'far fa-star';
                starsContainer.appendChild(star);
            }
        });
    });

    // Gestione approvazione recensione
    document.getElementById('approveReviewBtn').addEventListener('click', function() {
        if (!currentReviewId) return;
        
        // Qui andrebbe il codice per approvare effettivamente la recensione
        console.log(`Recensione ${currentReviewId} approvata`);
        
        // Chiudi il modal
        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewReviewModal'));
        viewModal.hide();
        
        // Mostra conferma
        showAlert('success', 'Recensione approvata con successo!');
        
        // Aggiorna la tabella (simulazione)
        updateReviewStatus(currentReviewId, 'approved');
    });

    // Gestione eliminazione dal modal di visualizzazione
    document.getElementById('rejectReviewBtn').addEventListener('click', function() {
        if (!currentReviewId) return;
        
        // Mostra il modal di conferma eliminazione
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteReviewModal'));
        deleteModal.show();
    });

    // Conferma eliminazione definitiva
    document.getElementById('confirmDeleteReview').addEventListener('click', function() {
        if (!currentReviewId) return;
        
        // Qui andrebbe il codice per eliminare effettivamente la recensione
        console.log(`Recensione ${currentReviewId} eliminata`);
        
        // Chiudi i modal
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteReviewModal'));
        deleteModal.hide();
        
        const viewModal = bootstrap.Modal.getInstance(document.getElementById('viewReviewModal'));
        if (viewModal) viewModal.hide();
        
        // Mostra conferma
        showAlert('success', 'Recensione eliminata con successo!');
        
        // Aggiorna la tabella (simulazione)
        updateReviewStatus(currentReviewId, 'deleted');
    });

    // Gestione dello stato delle segnalazioni
    const resolveReportButtons = document.querySelectorAll('.btn-outline-success');
    resolveReportButtons.forEach(button => {
        button.addEventListener('click', function() {
            const reportId = this.getAttribute('data-report-id');
            // Qui potresti inviare una richiesta per contrassegnare la segnalazione come risolta
            console.log(`Segnalazione ${reportId} contrassegnata come risolta`);
            
            // Cambia lo stato nella tabella (solo a scopo dimostrativo)
            const statusBadge = this.closest('tr').querySelector('.badge');
            statusBadge.classList.remove('bg-warning');
            statusBadge.classList.add('bg-success');
            statusBadge.textContent = 'Risolto';
        });
    });

    // Funzione per mostrare alert personalizzati
    function showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertDiv.style.zIndex = '1100';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Rimuovi l'alert dopo 5 secondi
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // Funzione per aggiornare lo stato della recensione nella tabella (simulazione)
    function updateReviewStatus(reviewId, action) {
        const row = document.querySelector(`.view-review-btn[data-id="${reviewId}"]`)?.closest('tr');
        if (!row) return;
        
        if (action === 'approved') {
            // Rimuovi la riga dalla tabella "da moderare"
            row.remove();
            showAlert('success', 'Recensione approvata e rimossa dalla lista');
        } else if (action === 'deleted') {
            // Rimuovi la riga dalla tabella
            row.remove();
            showAlert('success', 'Recensione eliminata con successo');
        }
    }

    document.getElementById('showAllTopSellers').addEventListener('click', function() {
    const extraRows = document.querySelectorAll('[data-top-seller="extra"]');
    const button = this;
    
    extraRows.forEach(row => {
        row.classList.toggle('d-none');
    });
    
    // Cambia il testo del pulsante
    if (button.textContent.includes('Top 5')) {
        button.innerHTML = '<i class="fas fa-chevron-up me-1"></i> Mostra meno';
    } else {
        button.innerHTML = 'Vedi tutti (Top 5)';
    }
});
});