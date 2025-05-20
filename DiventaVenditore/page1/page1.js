document.addEventListener('DOMContentLoaded', function() {
    // Array di immagini (sostituire con i propri percorsi)
    const images = [
        '/final/img/fotoArtig/artigianato-handmade.jpg',
        '/final/img//fotoArtig/lavoro.jpg', 
        '/final/img//fotoArtig/gioielli.jpg',
        '/final/img//fotoArtig/piattiColorati.jpg', 
        '/final/img//fotoArtig/mani.jpeg',
        '/final/img//fotoArtig/perline.jpg',
        '/final/img//fotoArtig/tazze.jpg',
        '/final/img//fotoArtig/vecchino.jpg', 
        '/final/img//fotoArtig/vasoArgilla.jpeg',
        '/final/img//fotoArtig/vetrata.jpg'
    ];
    
    const slider = document.getElementById('slider');
    let currentIndex = 0;
    
    // Funzione per cambiare immagine
    function changeBackground() {
        currentIndex = (currentIndex + 1) % images.length;
        slider.style.backgroundImage = `url('${images[currentIndex]}')`;
    }
    
    // Imposta l'immagine iniziale
    slider.style.backgroundImage = `url('${images[currentIndex]}')`;
    
    // Avvia l'intervallo per il cambio automatico (5000ms = 5 secondi)
    setInterval(changeBackground, 5000);
});