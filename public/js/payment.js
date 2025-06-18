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