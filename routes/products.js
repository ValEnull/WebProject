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

// GET tutti i prodotti - pubblico
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.prodotto_id,
        p.nome_prodotto,
        p.tipologia_id,
        p.prezzo,
        p.descrizione,
        p.quant,
        u.nome_utente AS nome_artigiano
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
    `;

    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero dei prodotti:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero dei prodotti.' });
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
router.get('/artigiano/:artigiano_id', async (req, res) => {
  const { artigiano_id } = req.params;

  try {
    const query = `
      SELECT p.*, a.tipologia_id AS artigiano_tipologia, u.nome_utente AS nome_artigiano
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      WHERE p.artigiano_id = $1
    `;

    const result = await pool.query(query, [artigiano_id]);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero dei prodotti per artigiano:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero dei prodotti per artigiano.' });
  }
});

// Elimina un prodotto - protetta per artigiani e admin
router.delete('/:id', authMiddleware(2), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.ruolo_id;

  try {
    let query = 'SELECT * FROM prodotti WHERE prodotto_id = $1';
    let values = [id];

    if (userRole < 3) {
      query += ' AND artigiano_id = $2';
      values.push(userId);
    }

    const checkResult = await pool.query(query, values);

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ message: 'Non sei autorizzato a eliminare questo prodotto.' });
    }

    await pool.query('DELETE FROM immagini WHERE prodotto_id = $1', [id]);

    await pool.query('DELETE FROM prodotti WHERE prodotto_id = $1', [id]);

    res.status(200).json({ message: 'Prodotto eliminato con successo.' });
  } catch (error) {
    console.error('Errore durante l’eliminazione del prodotto:', error);
    res.status(500).json({ message: 'Errore del server durante l’eliminazione del prodotto.' });
  }
});

// API immagini dei prodotti

// Aggiungi immagine a un prodotto - protetta per artigiani
router.post('/:id/images', authMiddleware(2), async (req, res) => {
  const prodottoId = req.params.id;
  const { url } = req.body;
  const artigianoId = req.user.id;

  if (!url) {
    return res.status(400).json({ message: 'URL immagine mancante' });
  }

  try {
    const prodCheck = await pool.query(
      'SELECT * FROM prodotti WHERE prodotto_id = $1 AND artigiano_id = $2',
      [prodottoId, artigianoId]
    );

    if (prodCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Non sei autorizzato a modificare questo prodotto' });
    }

    const result = await pool.query(
      'INSERT INTO immagini (prodotto_id, url) VALUES ($1, $2) RETURNING *',
      [prodottoId, url]
    );

    res.status(201).json({ message: 'Immagine aggiunta con successo', immagine: result.rows[0] });
  } catch (error) {
    console.error('Errore aggiunta immagine:', error);
    res.status(500).json({ message: 'Errore del server durante l\'aggiunta dell\'immagine' });
  }
});


module.exports = router;