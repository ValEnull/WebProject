// Funzione per cambiare l'immagine principale quando si clicca su una miniatura
function changeMainImage(element) {
    const mainImage = document.getElementById('mainProductImage');
    mainImage.src = element.src;
    
    // Rimuovi la classe 'active' da tutte le miniature
    document.querySelectorAll('.img-thumbnail').forEach(img => {
        img.classList.remove('active');
        img.classList.remove('border-primary');
    });
    
    // Aggiungi la classe 'active' alla miniatura cliccata
    element.classList.add('active');
    element.classList.add('border-primary');
}

// Funzione per gestire l'incremento della quantità
function incrementQuantity() {
    const quantityInput = document.getElementById('quantity');
    quantityInput.value = parseInt(quantityInput.value) + 1;
}

// Funzione per gestire il decremento della quantità
function decrementQuantity() {
    const quantityInput = document.getElementById('quantity');
    if (parseInt(quantityInput.value) > 1) {
        quantityInput.value = parseInt(quantityInput.value) - 1;
    }
}

// Funzione per impostare la prima immagine come attiva al caricamento
function setFirstImageAsActive() {
    const firstThumbnail = document.querySelector('.img-thumbnail');
    if (firstThumbnail) {
        changeMainImage(firstThumbnail);
    }
}

// Funzione per inizializzare gli event listeners
function initializeProductPage() {
    // Imposta la prima immagine come attiva
    setFirstImageAsActive();
    
    // Aggiungi event listeners ai pulsanti di quantità
    document.getElementById('increment')?.addEventListener('click', incrementQuantity);
    document.getElementById('decrement')?.addEventListener('click', decrementQuantity);
    
    // Aggiungi event listeners alle miniature
    document.querySelectorAll('.img-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            changeMainImage(this);
        });
    });
}

// Inizializza la pagina quando il DOM è completamente caricato
document.addEventListener('DOMContentLoaded', initializeProductPage);