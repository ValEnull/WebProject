/* Promo Banner */
document.addEventListener('DOMContentLoaded', function() {
    const promoText = document.getElementById('promo-text');
    const messages = [
        "Sconto inaugurazione 15% su tutti i prodotti!",
        "Spedizione gratuita per ordini sopra €50!",
        "Collezione estiva disponibile ora!",
        "Lo stai cercando? Lo abbiamo!",
        "Nuovi arrivi ogni settimana!",
        "Spedizione entro 3 giorni lavorativi!",
        "Nuove promozioni ogni mese!",
        "Inizia ora a cercare il regalo perfetto!"
    ];

    let currentIndex = 0;

    function changeMessage() {
        promoText.style.opacity = 0; 

        setTimeout(() => {
            currentIndex = (currentIndex + 1) % messages.length;
            promoText.textContent = messages[currentIndex];
            promoText.style.opacity = 1; 
        }, 500); 
    }

    setInterval(changeMessage, 7000); // Change every 7 seconds
});


/* Prodotto in evidenza */
document.addEventListener('DOMContentLoaded', function() {
    // "List of available products"
    const products = [
        {
            image: "/img/piattoApi.jpeg",
            title: "Piatto decorato a mano",
            description: "Bellissimo piatto decorato a mano raffiguranti api e fiorellini. Un regalo perfetto per chi ama la natura e i picknick!"
        },
        {
            image: "/img/fermaPortaPolli.jpg",
            title: "Fermaporte divertenti a forma di polli",
            description: "Divertenti e simpaticissimi fermaporta uccelli. Disponibili in vari colorazionie e misure. Perfetti per la casa, ufficio o per un regalo originale!"
        },
        {
            image: "/img/operaMetallo.png",
            title: "Opera artigianale con materiali riciclati",
            description: "Opera artigianale costruita a mano con materiali di recupero. Un pezzo unico che aggiunge un tocco di originalità a qualsiasi ambiente!"
        }
    ];

    // Random product selection
    const randomProduct = products[Math.floor(Math.random() * products.length)];

    // Update the product display
    document.getElementById('product-image').src = randomProduct.image;
    document.getElementById('product-title').textContent = randomProduct.title;
    document.getElementById('product-description').textContent = randomProduct.description;
});