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
module.exports = router;