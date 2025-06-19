document.addEventListener('DOMContentLoaded', function() {
    // Verifica login
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Logout
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Carica ordini
    caricaOrdini();
});

function caricaOrdini() {
    // Simulazione dati (sostituire con chiamata API reale)
    const ordiniEsempio = [
        {
            id: 'ORD-2023-001',
            data: '2023-05-15',
            stato: 'completato',
            prodotti: [
                { nome: 'Smartphone XYZ', prezzo: 599.99, quantita: 1, immagine: 'img/prodotti/phone.jpg' },
                { nome: 'Custodia Premium', prezzo: 29.99, quantita: 1, immagine: 'img/prodotti/case.jpg' }
            ],
            totale: 629.98,
            indirizzo: 'Via Roma 123, Milano'
        },
        {
            id: 'ORD-2023-002',
            data: '2023-06-20',
            stato: 'spedito',
            prodotti: [
                { nome: 'Cuffie Wireless', prezzo: 129.99, quantita: 2, immagine: 'img/prodotti/headphones.jpg' }
            ],
            totale: 259.98,
            indirizzo: 'Via Roma 123, Milano',
            tracking: 'TRK123456789'
        }
    ];

    mostraOrdini(ordiniEsempio);
}

function mostraOrdini(ordini) {
    const container = document.getElementById('ordini-container');
    
    if (ordini.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Non hai ancora effettuato ordini
            </div>
        `;
        return;
    }

    container.innerHTML = ordini.map(ordine => `
        <div class="ordine-card">
            <div class="ordine-header">
                <div>
                    <span class="ordine-id">Ordine #${ordine.id}</span>
                    <span class="ordine-data">${new Date(ordine.data).toLocaleDateString('it-IT')}</span>
                </div>
                <span class="ordine-stato ${getStatoClasse(ordine.stato)}">${getStatoTesto(ordine.stato)}</span>
            </div>
            
            <div class="ordine-prodotti">
                ${ordine.prodotti.map(prodotto => `
                    <div class="prodotto">
                        <img src="${prodotto.immagine || 'img/prodotti/default.jpg'}" alt="${prodotto.nome}" class="prodotto-immagine">
                        <div class="prodotto-info">
                            <div class="prodotto-nome">${prodotto.nome}</div>
                            <div>Quantità: ${prodotto.quantita}</div>
                            <div class="prodotto-prezzo">€ ${prodotto.prezzo.toFixed(2)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="ordine-footer mt-3 pt-3 border-top">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Totale:</strong> € ${ordine.totale.toFixed(2)}
                        ${ordine.tracking ? `<div class="mt-1"><small>Tracking: ${ordine.tracking}</small></div>` : ''}
                    </div>
                    <button class="btn btn-outline-secondary btn-sm" onclick="visualizzaDettagliOrdine('${ordine.id}')">
                        <i class="fas fa-search me-1"></i> Dettagli
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Funzioni di supporto
function getStatoClasse(stato) {
    const classi = {
        'completato': 'bg-success',
        'spedito': 'bg-primary',
        'in-elaborazione': 'bg-warning',
        'annullato': 'bg-danger'
    };
    return classi[stato] || 'bg-secondary';
}

function getStatoTesto(stato) {
    const testi = {
        'completato': 'Completato',
        'spedito': 'Spedito',
        'in-elaborazione': 'In elaborazione',
        'annullato': 'Annullato'
    };
    return testi[stato] || stato;
}

// Funzione per i dettagli ordine (da implementare)
function visualizzaDettagliOrdine(idOrdine) {
    alert(`Dettagli ordine ${idOrdine}\nQuesta funzionalità sarà implementata`);
}