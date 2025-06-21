# SaleCraft - E-commerce Platform

SaleCraft è una piattaforma e-commerce che connette acquirenti con artigiani e piccole aziende, offrendo prodotti unici e sostenibili.

## 🚀 Funzionalità principali

- **Area Clienti**: Registrazione, login, gestione profilo e ordini
- **Area Venditori**: Registrazione artigiani/piccole aziende
- **Area Admin**: Dashboard con statistiche e gestione utenti
- **Carrello**: Gestione prodotti e checkout
- **Pagamenti**: Sistema di pagamento integrato
- **Catalogo**: Visualizzazione prodotti con recensioni

## 🛠 Tecnologie utilizzate

- **Frontend**: 
  - HTML5, CSS3, JavaScript
  - Bootstrap 5.3
  - Font Awesome 6.5
- **Backend**: (da implementare)
  - Node.js/Express
  - Database MySQL/PostgreSQL

## 📁 Architettura
public/
├── css/
│ ├── adminArea.css
│ ├── carrello.css
│ ├── changePSW.css
│ ├── formCompratore.css
│ ├── index.css
│ ├── loginBootstrap.css
│ ├── ordini.css
│ ├── page1.css
│ ├── page2-form.css
│ ├── page3-esito.css
│ ├── payment.css
│ ├── prodotto.css
│ ├── resetPSWmail.css
│ └── userArea.css
├── img/
│ ├── fermaPortaPolli.jpg
│ ├── logoDef.png
│ ├── piattoApi.jpeg
│ └── placeholderProduct.png
├── js/
│ ├── adminArea.js
│ ├── carrello.js
│ ├── changePSW.js
│ ├── formCompratore.js
│ ├── index.js
│ ├── ordini.js
│ ├── page1.js
│ ├── page2-form.js
│ ├── payment.js
│ ├── prodotto.js
│ ├── resetPSWmail.js
│ └── userArea.js
└── html/
├── adminArea.html
├── carrello.html
├── changePSW.html
├── formCompratore.html
├── index.html
├── logingBootstrap.html
├── ordini.html
├── page1.html
├── page2-form.html
├── page3-esito.html
├── payment.html
├── prodotto.html
├── resetPSWmail.html
└── userArea.html

---

## 🖥 Pagine principali

1. **Homepage** (`index.html`) - Catalogo prodotti e navigazione
2. **Area Clienti** (`userArea.html`) - Gestione profilo utente
3. **Area Admin** (`adminArea.html`) - Dashboard amministrativa
4. **Carrello** (`carrello.html`) - Gestione ordini
5. **Pagamento** (`payment.html`) - Checkout e pagamento
6. **Registrazione** (`formCompratore.html`, `page2-form.html`) - Form per clienti e venditori
7. **Prodotto** (`prodotto.html`) - Dettaglio prodotto con recensioni

## 🛠 Installazione e avvio

### Prerequisiti
- Browser moderno (Chrome, Firefox, Edge, Opera)

### Passi per l'installazione
1. Clona il repository:
   ```bash
   git clone https://github.com/tuo-username/salecraft.git

2. Posiziona i file nella root del tuo server web
3. Apri nel Browser

---

## Funzioni Principali

### 🏠 Homepage (index.html):
Vetrina del nostro sito che permette al compratore di esplorare il nostro sito in cerca del prodotto perfetto da acquistare. 
Da questa pagina è possibile aggiungere i prodotti direttamente al carrello e accedere alla pagina del prodotto che si desidera vedere meglio.

### 🔎 Prodotto (prodotto.html):
Pagina che permette una visione più compelta del prodotto che si vuole acquistare. Permette di vedere i dettagli dei prodotti, oltre che la possibilità di lasciare recensioni su e di visualizzare quelle degli altri utenti. Da questa pagina è possibile aggiungere il prodotto al carrello.

## 🛒 Carrello (carrello.html):
Questa pagina mostra una panoramica di tutti i prodotti che il compratore si è salvato da comprare. Mostra anche il totale (parziale) della spesa.

## 💸 Checkout (payment.html):
Pagina successiva al carrello. Qui il venditore rimepie un form per la spedizione e per le informazioni della carta. Il nostro sito al momento accetta solo pagamenti con carta di credito/debito. Il pagamento avviene all'interno del nostro sito, senza l'ausilio di terzi, al termine del quale viene mostrato un popup in caso di esito positivo una volta completato il pagamento.
Viene mostrato il totale completo di spese di spedizione ed eventuali sconti.

## 👤 Profilo Compratore (userArea.html):
Attraverso una pagina dallo stile moderno, l'utente (compratore) è in grado di gestire le sue informazioni personali, come: nome utente, email, password e anche di eliminare il proprio account.

## 📦 Gestione Ordini (ordini.html):
Con questa pagina l'utente che compra sul nostro sito è in grado di monitorare tutti gli ordini fatti, anche quelli già ricevuti.

## 💼 Diventa Venditore (page1.html):
Attraverso questa pagina gli utenti che desiderano aprire un negozio sulla nostra piattaforma possono iniziare la loro avventura. 
Dopo una piccola introduzione al nostro sito e perché sceglierci l'utente, con pochi semplici click e dopo una rapida registrazione può iniziare a vendere sul nostro sito.

## 🚔 Dashboard Admin (admin.Area.html):
Da questa pagina, un admin del sito, è in grado di gestire e controllare l'andamento delle vendite, attraverso la sezione "Top Sellers" che mostra i top 3 prodotti venduti e può essere espansa fino a mostrare i top 5.
Segnalazioni Recenti, che mostra eventuali segnalazioni inviate dagli utenti e infine la funzione "cerca utenti" per poter cercare un utente registrato nel sito ed, eventualmente, eliminare il suo account.

---
## Responsive:
Tutto il sito è stato creato con l'idea in mente di essere adatto a ogni tipo di piattaforma. 
Attraverso l'utilizzo di Bootstrap e Media Query abbiamo reso il sito responsivo e adatto a qualsiasi dispositivo, anche quelli mobili.