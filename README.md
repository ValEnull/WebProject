# Artigianato Online - Backend

Sistema backend per la piattaforma di e-commerce **Artigianato Online**, sviluppato in **Node.js** con architettura RESTful. Il backend gestisce utenti (clienti, artigiani, admin), prodotti, ordini, immagini, recensioni e pagamenti. Include test automatici con Mocha + Supertest e database PostgreSQL.

---

## 🧱 Requisiti

- [Node.js](https://nodejs.org) v16+
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/)
- [PostgreSQL](https://www.postgresql.org/) (solo se non usi Docker)

---

## ⚙️ Installazione e Setup

1. **Clona il repository**
   ```bash
   git clone https://github.com/tuo-username/salecraft.git
   ```

2. **Configura le variabili d’ambiente**

Rinomina il file .env.example in .env

3. **Installa le dipendenze**
   Se vuoi usare il backend localmente senza Docker:

   ```bash
   npm install
   ```

---

## 🐳 Deploy con Docker

1. **Avvia con Docker Compose**

   ```bash
   docker compose up
   ```
2. Nel caso di errori di tipo modulo mancante, installa manualmente le dipendenze nel container**

   ```bash
   docker compose exec app npm install
   ```

   **NB** - al lancio del container si vedrà una stringa ripetuta piú volte:
   ```bash
   app-1  | ./wait-for-it.sh: line 12: nc: command not found
   ```
   questo é corretto. Lo script bash `wait-for-it.sh` crea un delay nella connessione del server al db per fare si che tutto il codice sia svolto nell'ordine giusto
3. Aprire il sito all'indirizzo http://localhost:5000/

---

## 🧪 Testing

1. **Reset + Seed + Test in ambiente isolato**
   ```bash
   docker compose up -d
   docker compose exec app npm test
   ```

   Questo comando:
   - Cancella il database
   - Ricrea lo schema
   - Esegue il seed di dati temporanei
   - Lancia i test automatici
   - Ripristina il seed con i dati “ufficiali” alla fine
Il risultato aspettato dal test automatico é "35 passing"

2. **Test specifici**
   ```bash
   docker compose exec app npx mocha test/users.test.js
   ```

---

## 📁 Struttura del Progetto

```
.
├── db/
│   ├── schema.sql
│   ├── seed.js
│   ├── clear.js
│   └── setup.js
├── routes/
│   ├── auth.js
│   ├── users.js
│   ├── products.js
│   ├── orders.js
│   ├── payments.js
│   └── ratings.js
├── middleware/
│   └── auth.js
├── test/
│   ├── auth.test.js
│   ├── users.test.js
│   ├── products.test.js
│   ├── orders.test.js
│   ├── rating.test.js
│   └── images.test.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── index.js
```

---

## 🔐 Autenticazione

Autenticazione con JWT + autorizzazione a 3 livelli:
- Cliente (`ruolo: 1`)
- Artigiano (`ruolo: 2`)
- Admin (`ruolo: 3`)

Tutte le route protette richiedono il token nel header:

```
Authorization: Bearer <jwt_token>
```
I tre ruoli hanno permessi diversi, ciascuno piò svolgere solo azioni specifiche:

- Cliente: può registrarsi, loggarsi, vedere prodotti, gestire carrello e lasciare recensioni.
- Artigiano: può modificare solo i propri prodotti e vedere gli ordini dei propri articoli.
- Admin: ha accesso completo a utenti, ordini e può eliminare prodotti.

---

## 🧪 API Endpoints principali

### Auth

| Metodo | Endpoint              | Descrizione          | Ruolo richiesto |
| ------ | --------------------- | -------------------- | --------------- |
| POST   | `/api/users/register` | Registrazione utente | Nessuno         |
| POST   | `/api/users/login`    | Login utente         | Nessuno         |

### Utenti

| Metodo | Endpoint                  | Descrizione                       | Ruolo richiesto                     |
| ------ | ------------------------- | --------------------------------- | ----------------------------------- |
| GET    | `/api/users`              | Lista utenti                      | Admin (`3`)                         |
| PATCH  | `/api/users/:id`          | Aggiorna dati personali           | Utente proprietario (`1`, `2`)      |
| PATCH  | `/api/users/:id/password` | Cambia password                   | Utente proprietario (`1`, `2`)      |
| PATCH  | `/api/users/:id/email`    | Cambia email                      | Utente proprietario (`1`, `2`)      |
| PATCH  | `/api/users/:id/ban`      | Banna/sbanna utente               | Admin (`3`)                         |
| DELETE | `/api/users/:id`          | Elimina (soft) proprio account    | Utente proprietario (`1`, `2`)      |
| PATCH  | `/api/users/artisans/:id` | Modifica dati artigiano           | Artigiano proprietario (`2`)        |
| DELETE | `/api/users/artisans/:id` | Disattiva artigiano (soft-delete) | Artigiano stesso o Admin (`2`, `3`) |
| GET    | `/api/users/artisans/:id` | Profilo pubblico artigiano        | Nessuno                             |


### Prodotti

| Metodo | Endpoint                            | Descrizione                   | Ruolo richiesto              |
| ------ | ----------------------------------- | ----------------------------- | ---------------------------- |
| GET    | `/api/products`                     | Lista prodotti                | Nessuno                      |
| POST   | `/api/products`                     | Crea prodotto                 | Artigiano (`2`)              |
| PATCH  | `/api/products/:id`                 | Modifica prodotto             | Artigiano proprietario (`2`) |
| DELETE | `/api/products/:id`                 | Elimina prodotto              | Artigiano proprietario (`2`) |
| POST   | `/api/products/:id/images`          | Aggiunge immagine al prodotto | Artigiano proprietario (`2`) |
| DELETE | `/api/products/:id/images/:imageId` | Elimina immagine              | Artigiano proprietario (`2`) |


### Ordini

| Metodo | Endpoint                            | Descrizione                     | Ruolo richiesto               |
| ------ | ----------------------------------- | ------------------------------- | ----------------------------- |
| GET    | `/api/orders/carrello`              | Stato attuale del carrello      | Cliente (`1`)                 |
| PATCH  | `/api/orders/carrello/:prodotto_id` | Modifica quantità prodotto      | Cliente (`1`)                 |
| DELETE | `/api/orders/carrello/:prodotto_id` | Rimuove prodotto dal carrello   | Cliente (`1`)                 |
| POST   | `/api/orders/checkout`              | Effettua il checkout            | Cliente (`1`)                 |
| GET    | `/api/orders/storico`               | Storico degli ordini effettuati | Cliente (`1`)                 |
| GET    | `/api/orders`                       | Ordini ricevuti                 | Artigiano (`2`) / Admin (`3`) |

### Recensioni

| Metodo | Endpoint                     | Descrizione                           | Ruolo richiesto |
| ------ | ---------------------------- | ------------------------------------- | --------------- |
| POST   | `/api/ratings/:order_id`     | Lascia recensione per ordine          | Cliente (`1`)   |
| GET    | `/api/ratings/prodotto/:id`  | Visualizza recensioni di un prodotto  | Nessuno         |
| GET    | `/api/ratings/artigiano/:id` | Visualizza recensioni di un artigiano | Nessuno         |

## Segnalazioni

| Metodo | Endpoint                 | Descrizione                          | Ruolo richiesto |
| ------ | ------------------------ | ------------------------------------ | --------------- |
| POST   | `/api/report/:ordine_id` | Invia una segnalazione su un ordine  | Cliente (`1`)   |
| GET    | `/api/report/cliente`    | Lista segnalazioni inviate           | Cliente (`1`)   |
| DELETE | `/api/report/:id`        | Cancella segnalazione propria        | Cliente (`1`)   |
| PATCH  | `/api/report/:id/close`  | Chiude segnalazione (gestione admin) | Admin (`3`)     |
| GET    | `/api/report/`           | Visualizza tutte le segnalazioni     | Admin (`3`)     |

---

## 📝 Note finali

- Le immagini sono salvate come BLOB nel DB (`BYTEA`) e convertite in base64 alla risposta.
- I test automatici includono reset + teardown completo del DB.
- Il deploy è stato pensato per funzionare sia localmente che su VPS tramite Docker. NB - per svolgere il deploy locale é necessario modificare in .env PGHOST e DB_URL per puntare a localhost
