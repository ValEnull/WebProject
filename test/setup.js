const fs = require('fs/promises');
const path = require('path');
const pool = require('../db/db');
const { seed } = require('../db/seed');

async function execSchema () {
  console.log('[setup] DROP SCHEMA e ricreazione...');
  await pool.query('DROP SCHEMA public CASCADE;');
  await pool.query('CREATE SCHEMA public;');
  await pool.query('GRANT ALL ON SCHEMA public TO postgres;');
  await pool.query('GRANT ALL ON SCHEMA public TO public;');

  const sql = await fs.readFile(
    path.join(__dirname, '../db/schema.sql'),
    'utf8'
  );
  await pool.query(sql);
}

before(async () => {
  console.log('[setup] RESET completo database test…');
  await execSchema(); // ora prima viene eseguito lo schema
  console.log('[setup] Schema eseguito correttamente');

  await seed(); // solo dopo viene lanciato il seed
  console.log('[setup] Seed completato con successo');
});

after(async () => {
  console.log('[teardown] chiusura pool globale');
  if (!pool.ended) await pool.end();
});