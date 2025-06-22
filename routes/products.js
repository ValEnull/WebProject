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

// GET dettagli prodotto con immagini codificate in base64
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const prodottoResult = await pool.query(
      `SELECT 
         p.prodotto_id, 
         p.nome_prodotto, 
         p.descrizione, 
         p.prezzo, 
         p.quant, 
         p.artigiano_id,
         u.nome_utente AS nome_artigiano
       FROM prodotti p
       JOIN utenti u ON u.id = p.artigiano_id
       WHERE p.prodotto_id = $1`,
      [id]
    );

    if (prodottoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Prodotto non trovato.' });
    }

    const prodotto = prodottoResult.rows[0];

    const immaginiResult = await pool.query(
      `SELECT immagine_id, immagine 
       FROM immagini 
       WHERE prodotto_id = $1`,
      [id]
    );

    const immagini = immaginiResult.rows.map(img => ({
      immagine_id: img.immagine_id,
      immagine_base64: img.immagine.toString('base64')
    }));

    prodotto.immagini = immagini;

    res.status(200).json(prodotto);
  } catch (error) {
    console.error('Errore nel recupero prodotto:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero del prodotto.' });
  }
});


// GET con paginazione e filtri - protetta per artigiani e admin
router.get('/', async (req, res) => {
  const { tipologia, search, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let baseQuery = `
      SELECT 
        p.prodotto_id,
        p.nome_prodotto,
        p.tipologia_id,
        p.prezzo,
        p.descrizione,
        p.quant,
        u.nome_utente AS nome_artigiano,
        img.immagine
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      LEFT JOIN LATERAL (
        SELECT immagine
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id
        LIMIT 1
      ) img ON true
      WHERE 1=1
      AND p.quant > 0
    `;

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM prodotti p
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];
    let paramIndex = 1;

    if (tipologia) {
      baseQuery += ` AND p.tipologia_id = $${paramIndex}`;
      countQuery += ` AND p.tipologia_id = $${paramIndex} AND p.quant > 0`;
      params.push(tipologia);
      countParams.push(tipologia);
      paramIndex++;
    }

    if (search) {
      baseQuery += ` AND (p.nome_prodotto ILIKE $${paramIndex} OR p.descrizione ILIKE $${paramIndex})`;
      countQuery += ` AND (p.nome_prodotto ILIKE $${paramIndex} OR p.descrizione ILIKE $${paramIndex})`;
      const searchValue = `%${search}%`;
      params.push(searchValue);
      countParams.push(searchValue);
      paramIndex++;
    }

    baseQuery += ` ORDER BY p.prodotto_id LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const data = await pool.query(baseQuery, params);
    const count = await pool.query(countQuery, countParams);

    const prodotti = data.rows.map(({ immagine, ...rest }) => ({
      ...rest,
      immagine_principale: immagine ? immagine.toString('base64') : null
    }));

    res.status(200).json({
      prodotti,
      total: parseInt(count.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Errore nel recupero dei prodotti:', err);
    res.status(500).json({ message: 'Errore server.' });
  }
});


// GET con filtro su tipologia - pubblico, con paginazione
router.get('/tipologia/:tipologia_id', async (req, res) => {
  const { tipologia_id } = req.params;
  const { page = 1, limit = 12, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let baseQuery = `
      SELECT 
        p.*, 
        u.nome_utente AS nome_artigiano,
        img.immagine
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u    ON a.artigiano_id = u.id
      LEFT JOIN LATERAL (
        SELECT immagine
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id
        LIMIT 1
      ) img ON true
      WHERE p.tipologia_id = $1
      andp.quant > 0
    `;

    let countQuery = `SELECT COUNT(*) FROM prodotti WHERE tipologia_id = $1 AND quant > 0`;
    const params = [tipologia_id];
    let idx = 2;

    if (search) {
      baseQuery  += ` AND (p.nome_prodotto ILIKE $${idx} OR p.descrizione ILIKE $${idx})`;
      countQuery += ` AND (nome_prodotto ILIKE $${idx} OR descrizione ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    baseQuery += ` ORDER BY p.prodotto_id LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const data  = await pool.query(baseQuery, params);
    const count = await pool.query(countQuery, [tipologia_id, ...(search ? [`%${search}%`] : [])]);

    const prodotti = data.rows.map(({ immagine, ...rest }) => ({
      ...rest,
      immagine_principale: immagine ? immagine.toString('base64') : null
    }));

    res.status(200).json({
      prodotti,
      total: parseInt(count.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Errore nel recupero prodotti per tipologia:', error);
    res.status(500).json({ message: 'Errore server.' });
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
        img.immagine
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      LEFT JOIN LATERAL (
        SELECT immagine
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id
        LIMIT 1
      ) img ON true
      WHERE p.tipologia_id = $1
      ORDER BY p.prodotto_id
    `;

    const result = await pool.query(query, [tipologia_id]);

    const prodotti = result.rows.map(({ immagine, ...rest }) => ({
  ...rest,
  immagine_principale: immagine ? immagine.toString('base64') : null
}));

    res.status(200).json(prodotti);
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
        img.immagine
      FROM prodotti p
      JOIN artigiani a ON p.artigiano_id = a.artigiano_id
      JOIN utenti u ON a.artigiano_id = u.id
      LEFT JOIN LATERAL (
        SELECT immagine
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id
        LIMIT 1
      ) img ON true
      WHERE p.artigiano_id = $1
      ORDER BY p.prodotto_id
    `;

    const result = await pool.query(query, [artigiano_id]);

    const prodotti = result.rows.map(({ immagine, ...rest }) => ({
  ...rest,
  immagine_principale: immagine ? immagine.toString('base64') : null
}));

    res.status(200).json(prodotti);
  } catch (error) {
    console.error('Errore nel recupero dei prodotti per artigiano:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero dei prodotti per artigiano.' });
  }
});

// Elimina un prodotto - protetta per artigiani e admin
// routes/products.js
router.delete('/:id', authMiddleware(2), async (req, res) => {
  const { id } = req.params;

  try {
    // 1️⃣ esiste almeno un ordine collegato?
    const used = await pool.query(
      'SELECT 1 FROM dettagli_ordine WHERE prodotto_id = $1 LIMIT 1',
      [id]
    );

    if (used.rowCount) {
      // → solo stock = 0
      await pool.query(
        'UPDATE prodotti SET quant = 0 WHERE prodotto_id = $1',
        [id]
      );
      return res.status(409).json({ message: 'PRODUCT_IN_ORDERS' });
    }

    // 2️⃣ nessun ordine: cancellazione “pulita”
    await pool.query(
      'DELETE FROM prodotti WHERE prodotto_id = $1',
      [id]
    );
    return res.sendStatus(204);

  } catch (err) {
    console.error('Errore DELETE prodotto:', err);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

// API immagini dei prodotti

// Aggiungi immagine a un prodotto - protetta per artigiani
router.post('/:prodotto_id/images', authMiddleware(2), async (req, res) => {
  const { prodotto_id } = req.params;
  const { immagine_base64 } = req.body;
  const user = req.user;

  if (!immagine_base64) {
    return res.status(400).json({ message: 'immagine_base64 è obbligatorio' });
  }

  try {
    // Verifica che il prodotto esista e appartenga all’artigiano
    const prodottoResult = await pool.query(
      'SELECT artigiano_id FROM prodotti WHERE prodotto_id = $1',
      [prodotto_id]
    );

    if (prodottoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Prodotto non trovato' });
    }

    const artigianoId = prodottoResult.rows[0].artigiano_id;

    if (user.ruolo_id !== 1 && user.id !== artigianoId) {
      return res.status(403).json({ message: 'Non autorizzato ad aggiungere immagini a questo prodotto' });
    }

    // Converti base64 in buffer
    const immagineBuffer = Buffer.from(immagine_base64, 'base64');

    // Inserisci nel DB
    const insertResult = await pool.query(
      'INSERT INTO immagini (prodotto_id, immagine) VALUES ($1, $2) RETURNING immagine_id',
      [prodotto_id, immagineBuffer]
    );

    res.status(201).json({
      message: 'Immagine inserita con successo',
      immagine_id: insertResult.rows[0].immagine_id
    });

  } catch (error) {
    console.error('Errore inserimento immagine:', error);
    res.status(500).json({ message: 'Errore server durante inserimento immagine' });
  }
});

// PATCH immagine - solo artigiano proprietario del prodotto o admin può modificare
router.patch('/images/:immagine_id', authMiddleware(2), async (req, res) => {
  const { immagine_id } = req.params;
  const { immagine_base64 } = req.body;
  const userId = req.user.id;

  if (!immagine_base64) {
    return res.status(400).json({ message: 'immagine_base64 è obbligatorio' });
  }

  try {
    // Controlla che l'immagine esista e che l'utente sia autorizzato
    const checkResult = await pool.query(
      `SELECT p.artigiano_id 
       FROM immagini i
       JOIN prodotti p ON i.prodotto_id = p.prodotto_id
       WHERE i.immagine_id = $1`,
      [immagine_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Immagine non trovata' });
    }

    const artigianoId = checkResult.rows[0].artigiano_id;
    const isAdmin = req.user.ruolo_id === 1;

    if (!isAdmin && artigianoId !== userId) {
      return res.status(403).json({ message: 'Non autorizzato a modificare questa immagine' });
    }

    // Converte il base64 in buffer binario
    const immagineBuffer = Buffer.from(immagine_base64, 'base64');

    const updateResult = await pool.query(
      `UPDATE immagini SET immagine = $1 WHERE immagine_id = $2 RETURNING immagine_id, prodotto_id`,
      [immagineBuffer, immagine_id]
    );

    res.status(200).json({
      message: 'Immagine aggiornata con successo',
      immagine: updateResult.rows[0]
    });

  } catch (error) {
    console.error("Errore nell'aggiornamento dell'immagine:", error);
    res.status(500).json({ message: "Errore del server durante l'aggiornamento dell'immagine." });
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