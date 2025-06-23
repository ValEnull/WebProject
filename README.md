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

---

## 🧪 API Endpoints principali

### Auth

| Metodo | Endpoint               | Descrizione          |
|--------|------------------------|----------------------|
| POST   | `/api/users/register`  | Registrazione utente |
| POST   | `/api/users/login`     | Login utente         |

### Utenti

| Metodo | Endpoint         | Descrizione                       |
|--------|------------------|-----------------------------------|
| GET    | `/api/users`     | Lista utenti (solo admin)        |
| PATCH  | `/api/users/:id` | Aggiorna dati (self o admin)     |
| PATCH  | `/api/users/:id/password` | Cambia password          |
| PATCH  | `/api/users/:id/ban` | Admin banna utente            |
| DELETE | `/api/users/:id` | Eliminazione soft del proprio utente |

### Prodotti

| Metodo | Endpoint              | Descrizione                         |
|--------|-----------------------|-------------------------------------|
| GET    | `/api/products`       | Lista prodotti                      |
| POST   | `/api/products`       | Crea prodotto (artigiano)           |
| PATCH  | `/api/products/:id`   | Modifica prodotto                   |
| DELETE | `/api/products/:id`   | Elimina prodotto                    |
| POST   | `/api/products/:id/images` | Aggiunge immagine (form-data) |
| DELETE | `/api/products/:id/images/:imageId` | Elimina immagine        |

### Ordini

| Metodo | Endpoint           | Descrizione                        |
|--------|--------------------|------------------------------------|
| GET    | `/api/orders/carrello` | Stato del carrello             |
| PATCH  | `/api/orders/carrello/:prodotto_id` | Modifica quantità |
| DELETE | `/api/orders/carrello/:prodotto_id` | Rimuove prodotto     |
| POST   | `/api/orders/checkout` | Effettua checkout (split)     |
| GET    | `/api/orders/storico` | Storico ordini                  |
| GET    | `/api/orders`       | Admin / Artigiano: ordini ricevuti |

### Recensioni

| Metodo | Endpoint             | Descrizione                     |
|--------|----------------------|---------------------------------|
| POST   | `/api/ratings/:order_id` | Lascia recensione ordine    |
| GET    | `/api/ratings/prodotto/:id` | Visualizza recensioni prodotto |
| GET    | `/api/ratings/artigiano/:id` | Visualizza recensioni artigiano |

---

## 📝 Note finali

- Le immagini sono salvate come BLOB nel DB (`BYTEA`) e convertite in base64 alla risposta.
- I test automatici includono reset + teardown completo del DB.
- Il deploy è stato pensato per funzionare sia localmente che su VPS tramite Docker. NB - per svolgere il deploy locale é necessario modificare in .env PGHOST e DB_URL per puntare a localhost
