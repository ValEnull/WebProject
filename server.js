require('dotenv').config();
const path = require('path');
const fs   = require('fs').promises;
const express = require('express');
const cors    = require('cors');
const pool    = require('./db/db');
const { seed } = require('./db/seed');

const app  = express();
const PORT = process.env.PORT || 5000;

/* --------------------------- MIDDLEWARE --------------------------- */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* ----------------------------- ROTTE ----------------------------- */
app.use('/api/users',    require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/rating',   require('./routes/rating'));
app.use('/api/report',   require('./routes/report'));

/* ---------------------- INIT DB (schema + seed) ------------------ */
async function setupDatabase () {
  try {
    /* 1. se la tabella utenti non esiste → eseguo l’intero schema */
    const { rows } = await pool.query(`
      SELECT
        to_regclass('public.utenti') IS NOT NULL AS utenti_exists,
        to_regclass('public.ruoli_ruolo_id_seq') IS NOT NULL AS ruoli_seq_exists
    `);
    if (!rows[0].utenti_exists || !rows[0].ruoli_seq_exists) {
      console.log('[init] eseguo schema.sql…');
      const sql = await fs.readFile(path.join(__dirname, 'db/schema.sql'), 'utf-8');
      await pool.query(sql);
    }

    /* 2. se il DB è vuoto → lancio il seed */
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int FROM utenti');
    if (count === 0) await seed();

    console.log('[init] database pronto ✔︎');
  } catch (err) {
    console.error('[init] ERRORE durante l’init del DB:', err);
    process.exit(1);          // blocca l’avvio se il DB non parte
  }
}

/* -------------------------- AVVIO SERVER -------------------------- */
if (require.main === module) {
  setupDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`Server avviato su http://localhost:${PORT}`);
    });
  });
}

/* --------------------------- EXPORT ------------------------------- */
module.exports = app;