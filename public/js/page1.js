document.addEventListener('DOMContentLoaded', function() {
    // Array di immagini
    const images = [
        '/img/fotoArtig/artigianato-handmade.jpg',
        '/img/fotoArtig/lavoro.jpg', 
        '/img/fotoArtig/gioielli.jpg',
        '/img/fotoArtig/piattiColorati.jpg', 
        '/img/fotoArtig/mani.jpeg',
        '/img/fotoArtig/perline.jpg',
        '/img/fotoArtig/tazze.jpg',
        '/img/fotoArtig/vecchino.jpg', 
        '/img/fotoArtig/vasoArgilla.jpeg',
        '/img/fotoArtig/vetrata.jpg'
    ];
    //commento per merge
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