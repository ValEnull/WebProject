const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const authMiddleware = require('../middleware/authMiddleware');

// Crea ordine con stato "non pagato"
router.post('/', authMiddleware(1), async (req, res) => {
  const cliente_id = req.user.id;
  const { prodotti } = req.body;

  if (!Array.isArray(prodotti) || prodotti.length === 0) {
    return res.status(400).json({ message: 'Prodotti mancanti o formato non valido.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ordineResult = await client.query(
      `INSERT INTO ordini (cliente_id, stato)
       VALUES ($1, 'non pagato') RETURNING ordine_id`,
      [cliente_id]
    );
    const ordine_id = ordineResult.rows[0].ordine_id;

    for (const { prodotto_id, quantita } of prodotti) {
      const { rows } = await client.query(
        'SELECT prezzo, quant FROM prodotti WHERE prodotto_id = $1',
        [prodotto_id]
      );

      if (rows.length === 0) {
        throw new Error(`Prodotto ID ${prodotto_id} non trovato.`);
      }
      const { prezzo, quant } = rows[0];

      if (quant < quantita) {
        throw new Error(`Quantità non disponibile per prodotto ID ${prodotto_id}.`);
      }

      await client.query(
        `INSERT INTO dettagli_ordine
         (ordine_id, prodotto_id, quantita, prezzo_unitario)
         VALUES ($1,$2,$3,$4)`,
        [ordine_id, prodotto_id, quantita, prezzo]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Ordine creato', ordine_id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Errore creazione ordine:', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;