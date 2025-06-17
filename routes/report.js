const express = require('express');
const router = express.Router();
const pool = require('../db/db'); 
const authMiddleware = require('../middleware/authMiddleware');

// POST /report - nuova segnalazione
router.post('/', authMiddleware(1), async (req, res) => {
  const { ordine_id, motivazione, testo } = req.body;
  const cliente_id = req.user.id;

  if (!ordine_id || !motivazione) {
    return res.status(400).json({ message: 'ordine_id e motivazione sono obbligatori' });
  }

  try {
    await pool.query('BEGIN');

    // Verifica che l’ordine appartenga al cliente loggato
    const checkOrderQuery = `
      SELECT * FROM ordini
      WHERE ordine_id = $1 AND cliente_id = $2
    `;
    const checkOrderResult = await pool.query(checkOrderQuery, [ordine_id, cliente_id]);

    if (checkOrderResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(403).json({ message: 'Non hai i permessi per segnalare questo ordine' });
    }

    // Inserisci la segnalazione
    const insertQuery = `
      INSERT INTO segnalazioni (ordine_id, cliente_id, motivazione, testo)
      VALUES ($1, $2, $3, $4)
      RETURNING segnalazione_id
    `;
    const insertResult = await pool.query(insertQuery, [ordine_id, cliente_id, motivazione, testo]);

    // Aggiorna lo stato dell’ordine
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