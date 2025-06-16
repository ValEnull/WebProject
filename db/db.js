const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
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
    } catch (schemaErr) {
        console.error(' Errore nell\'esecuzione dello schema:', schemaErr);
    } finally {
        done(); 
    }

});

module.exports = pool;
//prova