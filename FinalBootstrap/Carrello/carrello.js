document.addEventListener('DOMContentLoaded', function() {
    function updateTotals() {
        let total = 0;
        document.querySelectorAll('#cart-body .mb-3.position-relative').forEach(card => {
            const price = parseFloat(card.querySelector('.price').textContent.replace(',', '.'));
            const qty = parseInt(card.querySelector('.quantity').value);
            const itemTotal = (price * qty).toFixed(2);
            card.querySelector('.item-total').textContent = itemTotal;
            total += parseFloat(itemTotal);
        });
        document.getElementById('cart-total').textContent = total.toFixed(2);
    }

    function attachEvents() {
        document.querySelectorAll('.quantity').forEach(input => {
            input.addEventListener('input', function() {
                if (this.value < 1) this.value = 1;
                updateTotals();
            });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.mb-3.position-relative').remove();
                updateTotals();
            });
        });
    }

    updateTotals();
    attachEvents();
});