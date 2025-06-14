const express = require('express');
const router = express.Router();
const pool = require('../db/db'); 
const authMiddleware = require('../middleware/auth');

// Inserimento di un nuovo prodotto - protetta per artigiani

router.post('/', authMiddleware(2), async (req, res) => {
  const { nome_prodotto, tipologia_id, prezzo, descrizione, quant } = req.body;
  const artigiano_id = req.user.id;

  if (!nome_prodotto || !prezzo || quant == null) {
    return res.status(400).json({ message: 'I campi obbligatori sono mancanti.' });
  }

  try {
    const insertProductQuery = `
      INSERT INTO prodotti (artigiano_id, nome_prodotto, tipologia_id, prezzo, descrizione, quant)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING prodotto_id
    `;
    const values = [artigiano_id, nome_prodotto, tipologia_id, prezzo, descrizione, quant];
    const result = await pool.query(insertProductQuery, values);

    res.status(201).json({
      message: 'Prodotto inserito con successo',
      prodotto_id: result.rows[0].prodotto_id
    });

  } catch (error) {
    console.error("Errore inserimento prodotto:", error);
    res.status(500).json({ message: 'Errore del server durante la creazione del prodotto.' });
  }
});