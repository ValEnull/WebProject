const fs   = require('fs');
const path = require('path');
const pool = require('../db/db');

async function execSchema() {
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await pool.query(stmt);
  }
}

before(async () => {
  console.log('[setup] RESET completo database test…');
  await pool.query('DROP SCHEMA public CASCADE;');
  await pool.query('CREATE SCHEMA public;');
  await pool.query('SET search_path TO public;');
  await pool.query('DISCARD ALL');
  console.log('[setup] esecuzione schema.sql…');
  await execSchema();
  console.log('[setup] schema creato.');

  // Import dinamico del seed dopo schema completo
  console.log('Esecuzione seed...');
  const { seed } = require('../db/seed');
  await seed();
  // Aspetta che il seed abbia inserito gli utenti
  let tentativi = 0;
  while (tentativi < 20) {
    const { rows } = await pool.query('SELECT COUNT(*) FROM utenti');
    if (+rows[0].count > 0) break;
    await new Promise(r => setTimeout(r, 200));
    tentativi++;
  }
  if (tentativi === 20) throw new Error('Timeout seed');

  console.log('[setup] seed completato.');
});

after(async () => {
  console.log('[teardown] chiusura pool globale');
  await new Promise(r => setTimeout(r, 200)); // aspetta completamento finale
  if (!pool.ended) await pool.end();
});