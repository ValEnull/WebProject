const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const authMiddleware = require('../middleware/auth');

// Aggiunta recensione per un prodotto - protetta per cliente che ha comprato il prodotto
router.post('/:id', authMiddleware(1), async (req, res) => {
  const cliente_id = req.user.id;
  const prodotto_id = parseInt(req.params.id, 10);
  const { valutazione, descrizione } = req.body;

  if (!valutazione || valutazione < 1 || valutazione > 5) {
    return res.status(400).json({ message: 'Valutazione non valida, deve essere da 1 a 5.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO recensioni (cliente_id, prodotto_id, valutazione, descrizione)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cliente_id, prodotto_id, valutazione, descrizione || null]
    );
    res.status(201).json({ message: 'Recensione creata', recensione: result.rows[0] });
  } catch (error) {
    console.error('Errore creazione recensione:', error);
    res.status(500).json({ message: 'Errore del server durante la creazione della recensione.' });
  }
});

// Recupera il voto medio di un prodotto
router.get('/:prodotto_id/average', async (req, res) => {
  const { prodotto_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
         ROUND(AVG(valutazione)::numeric, 2) AS media_voto,
         COUNT(*) AS numero_recensioni
       FROM recensioni
       WHERE prodotto_id = $1`,
      [prodotto_id]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Errore nel calcolo media voto:', error);
    res.status(500).json({ message: 'Errore del server.' });
  }
});

// Recupera tutte le recensioni di un prodotto
router.get('/:prodotto_id', async (req, res) => {
  const { prodotto_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
         r.recensione_id,
         r.valutazione,
         r.descrizione,
         r.data_recensione,
         u.nome_utente
       FROM recensioni r
       JOIN utenti u ON r.cliente_id = u.id
       WHERE r.prodotto_id = $1
       ORDER BY r.data_recensione DESC`,
      [prodotto_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero recensioni:', error);
    res.status(500).json({ message: 'Errore del server.' });
  }
});

// Aggiorna una recensione - protetta per cliente che ha scritto la recensione
router.patch('/:recensione_id', authMiddleware(1), async (req, res) => {
  const { recensione_id } = req.params;
  const { valutazione, descrizione } = req.body;
  const utente_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT cliente_id FROM recensioni WHERE recensione_id = $1`,
      [recensione_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Recensione non trovata.' });
    }

    const recensione = result.rows[0];

    if (recensione.cliente_id !== utente_id) {
      return res.status(403).json({ message: 'Non autorizzato a modificare questa recensione.' });
    }

    await pool.query(
      `UPDATE recensioni
       SET 
         valutazione = COALESCE($1, valutazione),
         descrizione = COALESCE($2, descrizione)
       WHERE recensione_id = $3`,
      [valutazione, descrizione, recensione_id]
    );

    res.status(200).json({ message: 'Recensione aggiornata con successo.' });
  } catch (error) {
    console.error('Errore aggiornamento recensione:', error);
    res.status(500).json({ message: 'Errore del server.' });
  }
});

// Elimina una recensione - protetta per cliente che ha scritto la recensione e admin
router.delete('/:recensione_id', authMiddleware(1), async (req, res) => {
  const { recensione_id } = req.params;
  const utente_id = req.user.id;
  const ruolo = req.user.ruolo_id;

  try {
    // Recupera la recensione per verificarne l'esistenza e il proprietario
    const { rows, rowCount } = await pool.query(
      `SELECT cliente_id FROM recensioni WHERE recensione_id = $1`,
      [recensione_id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Recensione non trovata.' });
    }

    const isOwner = rows[0].cliente_id === utente_id;
    const isAdmin = ruolo === 3;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Non autorizzato a cancellare questa recensione.' });
    }

    await pool.query(
      `DELETE FROM recensioni WHERE recensione_id = $1`,
      [recensione_id]
    );

    res.status(200).json({ message: 'Recensione eliminata con successo.' });
  } catch (error) {
    console.error('Errore durante la cancellazione recensione:', error);
    res.status(500).json({ message: 'Errore del server.' });
  }
});

module.exports = router;