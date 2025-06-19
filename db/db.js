const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // o altri parametri singoli
    idleTimeoutMillis: 10000, // 10 secondi inattività
     connectionTimeoutMillis: 5000, // 5 secondi per tentare la connessione
});

pool.connect(async (err, client, done) => {
    if (err) {
        console.error('Errore di connessione al database', err);
        return;
    }

    console.log(' Connessione al database avvenuta con successo');

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await client.query(schema);
        console.log(' Schema eseguito correttamente');

        const seed = require('./seed');
        console.log(' Seed eseguito correttamente');
    } catch (schemaErr) {
        console.error(' Errore nell\'esecuzione dello schema:', schemaErr);
    } finally {
        done(); 
    }

});

module.exports = pool;

