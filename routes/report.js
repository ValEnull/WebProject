const express = require('express');
const router = express.Router();
const pool = require('../db/db'); 
const authMiddleware = require('../middleware/auth');

// POST /report - nuova segnalazione
router.post('/:ordine_id', authMiddleware(1), async (req, res) => {
  const ordine_id = parseInt(req.params.ordine_id, 10);
  const { motivazione, testo } = req.body;
  const cliente_id = req.user.id;

  if (!ordine_id || !motivazione) {
    return res.status(400).json({ message: 'ordine_id e motivazione sono obbligatori' });
  }

  try {
    await pool.query('BEGIN');

    const checkOrderQuery = `
      SELECT 1 FROM ordini
      WHERE ordine_id = $1 AND cliente_id = $2
    `;
    const checkOrderResult = await pool.query(checkOrderQuery, [ordine_id, cliente_id]);

    if (checkOrderResult.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(403).json({ message: 'Non hai i permessi per segnalare questo ordine' });
    }

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

// POST chiusura segnalazione
router.patch('/:segnalazione_id/close', authMiddleware(3), async (req, res) => {
  const segnalazione_id = parseInt(req.params.segnalazione_id, 10);
  const { risoluzione } = req.body;

  try {
    await pool.query('BEGIN');

    // Recupera l'ordine associato alla segnalazione
    const segnalazioneRes = await pool.query(
      'SELECT ordine_id FROM segnalazioni WHERE segnalazione_id = $1 AND stato_segnalazione = $2',
      [segnalazione_id, 'in attesa']
    );

    if (segnalazioneRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Segnalazione non trovata o già risolta' });
    }

    const ordine_id = segnalazioneRes.rows[0].ordine_id;

    // Aggiorna segnalazione
    await pool.query(
      `UPDATE segnalazioni
       SET risoluzione = $1, data_risoluzione = NOW(), stato_segnalazione = 'risolta'
       WHERE segnalazione_id = $2`,
      [risoluzione, segnalazione_id]
    );

    // Aggiorna stato ordine
    await pool.query(
      `UPDATE ordini
       SET stato = 'chiuso'
       WHERE ordine_id = $1`,
      [ordine_id]
    );

    await pool.query('COMMIT');

    res.json({ message: 'Segnalazione chiusa con successo' });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Errore durante la chiusura della segnalazione:', error);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});
module.exports = router;