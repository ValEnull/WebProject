document.addEventListener('DOMContentLoaded', function() {
    // Abilita tooltip
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Logica per il calcolo della spedizione (esempio)
    function calculateShipping(subtotal) {
        const shippingCostElement = document.querySelector('.shipping-cost');
        const shippingDiscountElement = document.querySelector('.shipping-discount');
        const totalAmountElement = document.querySelector('.total-amount');
        
        const shippingCost = 4.99;
        let shippingDiscount = 0;
        
        if (subtotal >= 50) {
            shippingDiscount = shippingCost;
        }
        
        const total = subtotal + shippingCost - shippingDiscount;
        
        shippingCostElement.textContent = `€${shippingCost.toFixed(2)}`;
        shippingDiscountElement.textContent = `-€${shippingDiscount.toFixed(2)}`;
        totalAmountElement.textContent = `€${total.toFixed(2)}`;
    }
    
    // Esempio di chiamata (dovresti collegarlo al tuo carrello reale)
    calculateShipping(0); // Inizializza a 0
});

// Simulazione pagamento
document.addEventListener('DOMContentLoaded', function() {
    // Genera un numero di transazione casuale quando il modal viene mostrato
    document.getElementById('paymentConfirmationModal').addEventListener('show.bs.modal', function() {
        const transactionCode = 'SIM-' + Math.floor(Math.random() * 1000000);
        document.querySelector('#paymentConfirmationModal .text-muted').textContent = 
            'Codice transazione: ' + transactionCode;
        
        // Simula un ritardo di elaborazione (opzionale)
        const submitBtn = document.querySelector('[data-bs-target="#paymentConfirmationModal"]');
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Elaborazione...';
        submitBtn.disabled = true;
        
        setTimeout(function() {
            submitBtn.innerHTML = '<i class="fas fa-lock me-2"></i>Completa l\'ordine';
            submitBtn.disabled = false;
        }, 1500);
    });
});