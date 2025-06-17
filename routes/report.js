const express = require('express');
const router = express.Router();
const pool = require('../db/db'); 

// POST /report - nuova segnalazione
router.post('/', async (req, res) => {
  const { ordine_id, cliente_id, motivazione, testo } = req.body;

  if (!ordine_id || !cliente_id || !motivazione) {
    return res.status(400).json({ message: 'ordine_id, cliente_id e motivazione sono obbligatori' });
  }

  try {
    await pool.query('BEGIN');

    const insertQuery = `
      INSERT INTO segnalazioni (ordine_id, cliente_id, motivazione, testo)
      VALUES ($1, $2, $3, $4)
      RETURNING segnalazione_id
    `;
    const insertResult = await pool.query(insertQuery, [ordine_id, cliente_id, motivazione, testo]);

    const updateQuery = `
      UPDATE ordini
      SET stato = 'in controversia'
      WHERE ordine_id = $1
    `;
    await pool.query(updateQuery, [ordine_id]);

    await pool.query('COMMIT');

    res.status(201).json({
      message: 'Segnalazione inviata con successo',
      segnalazione_id: insertResult.rows[0].segnalazione_id
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Errore durante l\'inserimento della segnalazione:', error);
    res.status(500).json({ message: 'Errore del server durante l\'invio della segnalazione' });
  }
});

module.exports = router;