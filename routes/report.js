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

// PATCH chiusura segnalazione
router.patch('/:segnalazione_id/close', authMiddleware(3), async (req, res) => {
  const segnalazione_id = parseInt(req.params.segnalazione_id, 10);
  const { risoluzione } = req.body;

  try {
    await pool.query('BEGIN');

    const segnalazioneRes = await pool.query(
      'SELECT ordine_id FROM segnalazioni WHERE segnalazione_id = $1 AND stato_segnalazione = $2',
      [segnalazione_id, 'in attesa']
    );

    if (segnalazioneRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Segnalazione non trovata o già risolta' });
    }

    const ordine_id = segnalazioneRes.rows[0].ordine_id;
  

    await pool.query(
      `UPDATE segnalazioni
       SET risoluzione = $1, data_risoluzione = NOW(), stato_segnalazione = 'risolta'
       WHERE segnalazione_id = $2`,
      [risoluzione, segnalazione_id]
    );

    await pool.query(
      `UPDATE ordini
       SET stato = 'concluso'
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

// GET generico -protetta per admin
router.get('/', authMiddleware(3), async (req, res) => {
  try {
    const { rows } = await pool.query(`
    SELECT s.*, d.prodotto_id
    FROM segnalazioni s
    JOIN LATERAL (
      SELECT prodotto_id
      FROM dettagli_ordine
      WHERE ordine_id = s.ordine_id
      LIMIT 1
    ) d ON true
    ORDER BY s.data_segnalazione DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Errore recupero segnalazioni admin:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// GET per cliente - protetta per cliente
router.get('/cliente', authMiddleware(1), async (req, res) => {
  const cliente_id = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM segnalazioni WHERE cliente_id = $1 ORDER BY data_segnalazione DESC`,
      [cliente_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Errore recupero segnalazioni cliente:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// DELETE rimozione segnalazione - protetta per utente proprietario
router.delete('/:id', authMiddleware(1), async (req, res) => {
  const segnalazione_id = parseInt(req.params.id, 10);
  const cliente_id = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT cliente_id, stato_segnalazione
       FROM segnalazioni
       WHERE segnalazione_id = $1`,
      [segnalazione_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Segnalazione non trovata' });
    }

    const segnalazione = rows[0];

    if (segnalazione.cliente_id !== cliente_id) {
      return res.status(403).json({ message: 'Non hai i permessi per eliminare questa segnalazione' });
    }

    if (segnalazione.stato_segnalazione !== 'in attesa') {
      return res.status(400).json({ message: 'Non è possibile eliminare una segnalazione già risolta' });
    }

    await pool.query(
      `DELETE FROM segnalazioni WHERE segnalazione_id = $1`,
      [segnalazione_id]
    );

    res.status(200).json({ message: 'Segnalazione eliminata con successo' });
  } catch (error) {
    console.error('Errore durante la cancellazione della segnalazione:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});
module.exports = router;