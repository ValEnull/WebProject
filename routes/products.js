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
    const prodottoQuery = `
      SELECT p.prodotto_id, p.nome_prodotto, p.tipologia_id, p.prezzo, p.descrizione, p.quant, a.artigiano_id, u.nome_utente AS nome_artigiano
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      WHERE p.prodotto_id = $1
    `;
    const prodottoResult = await pool.query(prodottoQuery, [id]);

    if (prodottoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Prodotto non trovato' });
    }

    const prodotto = prodottoResult.rows[0];

    const immaginiQuery = `
      SELECT immagine_id, immagine_link
      FROM immagini
      WHERE prodotto_id = $1
      ORDER BY immagine_id ASC
    `;
    const immaginiResult = await pool.query(immaginiQuery, [id]);

    prodotto.immagini = immaginiResult.rows;

    res.status(200).json(prodotto);
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
        u.nome_utente AS nome_artigiano,
        img.immagine_link AS immagine_principale
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      LEFT JOIN LATERAL (
        SELECT immagine_link
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id
        LIMIT 1
      ) img ON true
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
      SELECT 
        p.*, 
        u.nome_utente AS nome_artigiano,
        img.immagine_link AS immagine_principale
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      LEFT JOIN LATERAL (
        SELECT immagine_link
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id
        LIMIT 1
      ) img ON true
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
      SELECT 
        p.*, 
        u.nome_utente AS nome_artigiano,
        img.immagine_link AS immagine_principale
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      LEFT JOIN LATERAL (
        SELECT immagine_link
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id
        LIMIT 1
      ) img ON true
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
router.post('/:prodotto_id/images', authMiddleware(2), async (req, res) => {
  const { prodotto_id } = req.params;
  const { immagine_link } = req.body;
  const user = req.user; 

  if (!immagine_link) {
    return res.status(400).json({ message: 'immagine_link è obbligatorio' });
  }

  try {
    const prodottoResult = await pool.query('SELECT artigiano_id FROM prodotti WHERE prodotto_id = $1', [prodotto_id]);
    if (prodottoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Prodotto non trovato' });
    }

    const artigianoId = prodottoResult.rows[0].artigiano_id;

    if (user.ruolo_id !== 1 && user.id !== artigianoId) {
      return res.status(403).json({ message: 'Non autorizzato ad aggiungere immagini a questo prodotto' });
    }

    const insertResult = await pool.query(
      'INSERT INTO immagini (prodotto_id, immagine_link) VALUES ($1, $2) RETURNING *',
      [prodotto_id, immagine_link]
    );

    res.status(201).json({ message: 'Immagine inserita', immagine: insertResult.rows[0] });

  } catch (error) {
    console.error('Errore inserimento immagine:', error);
    res.status(500).json({ message: 'Errore server durante inserimento immagine' });
  }
});

// PATCH immagine - solo artigiano proprietario del prodotto e admin può modificare 
router.patch('/images/:immagine_id', authMiddleware(2), async (req, res) => {
  const { immagine_id } = req.params;
  const { immagine_link } = req.body;
  const userId = req.user.id;

  if (!immagine_link) {
    return res.status(400).json({ message: 'immagine_link è obbligatorio' });
  }

  try {
    const queryCheck = `
      SELECT p.artigiano_id 
      FROM immagini i
      JOIN prodotti p ON i.prodotto_id = p.prodotto_id
      WHERE i.immagine_id = $1
    `;
    const checkResult = await pool.query(queryCheck, [immagine_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Immagine non trovata' });
    }

    const artigianoId = checkResult.rows[0].artigiano_id;

    if (req.user.ruolo_id !== 1 && artigianoId !== userId) {
      return res.status(403).json({ message: 'Non autorizzato a modificare questa immagine' });
    }

    const queryUpdate = `
      UPDATE immagini SET immagine_link = $1 WHERE immagine_id = $2
      RETURNING *
    `;
    const updateResult = await pool.query(queryUpdate, [immagine_link, immagine_id]);

    res.status(200).json({
      message: 'Immagine aggiornata con successo',
      immagine: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'immagine:', error);
    res.status(500).json({ message: 'Errore del server durante l\'aggiornamento dell\'immagine.' });
  }
});

// DELETE immagine - solo artigiano proprietario del prodotto o admin
router.delete('/images/:immagine_id', authMiddleware(2), async (req, res) => {
  const { immagine_id } = req.params;
  const userId = req.user.id;

  try {
    const queryCheck = `
      SELECT p.artigiano_id 
      FROM immagini i
      JOIN prodotti p ON i.prodotto_id = p.prodotto_id
      WHERE i.immagine_id = $1
    `;
    const checkResult = await pool.query(queryCheck, [immagine_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Immagine non trovata' });
    }

    const artigianoId = checkResult.rows[0].artigiano_id;

    if (req.user.ruolo_id !== 1 && artigianoId !== userId) {
      return res.status(403).json({ message: 'Non autorizzato a cancellare questa immagine' });
    }

    await pool.query('DELETE FROM immagini WHERE immagine_id = $1', [immagine_id]);

    res.status(200).json({ message: 'Immagine cancellata con successo' });

  } catch (error) {
    console.error('Errore nella cancellazione dell\'immagine:', error);
    res.status(500).json({ message: 'Errore del server durante la cancellazione dell\'immagine.' });
  }
});

module.exports = router;