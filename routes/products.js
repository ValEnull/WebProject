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

// Aggiornamento di un prodotto - protetta per artigiani e solo per i loro prodotti

router.patch('/:id', authMiddleware(2), async (req, res) => {
  const { id } = req.params;
  const artigiano_id = req.user.id;
  const { nome_prodotto, tipologia_id, prezzo, descrizione, quant } = req.body;

  try {
    const productRes = await pool.query(
      'SELECT * FROM prodotti WHERE prodotto_id = $1 AND artigiano_id = $2',
      [id, artigiano_id]
    );

    if (productRes.rows.length === 0) {
      return res.status(404).json({ message: 'Prodotto non trovato o non autorizzato' });
    }

    const updateQuery = `
      UPDATE prodotti SET
        nome_prodotto = COALESCE($1, nome_prodotto),
        tipologia_id = COALESCE($2, tipologia_id),
        prezzo = COALESCE($3, prezzo),
        descrizione = COALESCE($4, descrizione),
        quant = COALESCE($5, quant)
      WHERE prodotto_id = $6
      RETURNING *
    `;

    const values = [nome_prodotto, tipologia_id, prezzo, descrizione, quant, id];

    const updateRes = await pool.query(updateQuery, values);

    res.status(200).json({
      message: 'Prodotto aggiornato con successo',
      prodotto: updateRes.rows[0],
    });
  } catch (error) {
    console.error('Errore aggiornamento prodotto:', error);
    res.status(500).json({ message: 'Errore del server durante l\'aggiornamento del prodotto' });
  }
});

// GET prodotto singolo - pubblico
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT p.prodotto_id, p.nome_prodotto, p.tipologia_id, p.prezzo, p.descrizione, p.quant,
             a.tipologia_id AS artigiano_tipologia, u.nome_utente AS nome_artigiano
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      WHERE p.prodotto_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Prodotto non trovato' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Errore nel recupero del prodotto:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero del prodotto.' });
  }
});

// GET con filtro su tipologia - pubblico
router.get('/tipologia/:tipologia_id', async (req, res) => {
  const { tipologia_id } = req.params;

  try {
    const query = `
      SELECT p.*, a.tipologia_id AS artigiano_tipologia, u.nome_utente AS nome_artigiano
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      WHERE p.tipologia_id = $1
    `;

    const result = await pool.query(query, [tipologia_id]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero dei prodotti per tipologia:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero dei prodotti per tipologia.' });
  }
});

// GET con filtro su artigiano - pubblico
module.exports = router;