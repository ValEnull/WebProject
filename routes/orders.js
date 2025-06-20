const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const authMiddleware = require('../middleware/auth');

// POST ordine - protetta per cliente - Aggiunta al carrello 
router.post('/carrello/:prodotto_id', authMiddleware(1), async (req, res) => {
  const utenteId = req.user.id;
  const prodottoId = parseInt(req.params.prodotto_id, 10);
  const { quantita } = req.body;

  if (!prodottoId || !quantita || quantita <= 0) {
    return res.status(400).json({ message: 'ID prodotto e quantità validi richiesti.' });
  }

  try {
    await pool.query('BEGIN');

    // 1. Trova o crea ordine non pagato
    const ordineResult = await pool.query(`
      SELECT ordine_id FROM ordini 
      WHERE cliente_id = $1 AND stato = 'non pagato'
      LIMIT 1
    `, [utenteId]);

    let ordineId;
    if (ordineResult.rowCount === 0) {
      const nuovoOrdine = await pool.query(`
        INSERT INTO ordini (cliente_id, stato) 
        VALUES ($1, 'non pagato') 
        RETURNING ordine_id
      `, [utenteId]);
      ordineId = nuovoOrdine.rows[0].ordine_id;
    } else {
      ordineId = ordineResult.rows[0].ordine_id;
    }

    // 2. Recupera il prezzo del prodotto e la quantità disponibile (quant)
    const prodottoResult = await pool.query(`
      SELECT prezzo, quant
      FROM prodotti
      WHERE prodotto_id = $1
      FOR UPDATE
    `, [prodottoId]);

    if (prodottoResult.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Prodotto non trovato.' });
    }

    const { prezzo: prezzoUnitario, quant: stockDisponibile } = prodottoResult.rows[0];

    // 3. Verifica se il prodotto è già nel carrello
    const dettaglioResult = await pool.query(`
      SELECT quantita FROM dettagli_ordine
      WHERE ordine_id = $1 AND prodotto_id = $2
    `, [ordineId, prodottoId]);

    let quantitaNelCarrello = 0;
    if (dettaglioResult.rowCount > 0) {
      quantitaNelCarrello = dettaglioResult.rows[0].quantita;
    }

    const nuovaQuantitaTotale = quantitaNelCarrello + quantita;

    if (nuovaQuantitaTotale > stockDisponibile) {
      await pool.query('ROLLBACK');
      return res.status(400).json({
        message: `Disponibilità insufficiente: in magazzino ${stockDisponibile}, già nel carrello ${quantitaNelCarrello}.`
      });
    }

    if (quantitaNelCarrello > 0) {
      await pool.query(`
        UPDATE dettagli_ordine
        SET quantita = $1
        WHERE ordine_id = $2 AND prodotto_id = $3
      `, [nuovaQuantitaTotale, ordineId, prodottoId]);
    } else {
      await pool.query(`
        INSERT INTO dettagli_ordine (ordine_id, prodotto_id, quantita, prezzo_unitario)
        VALUES ($1, $2, $3, $4)
      `, [ordineId, prodottoId, quantita, prezzoUnitario]);
    }

    // 4. Scala lo stock del prodotto 
    await pool.query(`
    UPDATE prodotti
    SET quant = quant - $1
    WHERE prodotto_id = $2
    `, [quantita, prodottoId]);

    await pool.query('COMMIT');
    res.status(201).json({ message: 'Prodotto aggiunto al carrello.', ordine_id: ordineId });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Errore aggiunta prodotto al carrello:', error);
    res.status(500).json({ message: 'Errore del server.' });
  }
});



// GET carrello - protetta per cliente - ottiene i dettagli del carrello
router.get('/carrello', authMiddleware(1), async (req, res) => {
  const userId = req.user.id;

  try {
    /* 1. trova ordine "non pagato" */
    const ordineResult = await pool.query(`
      SELECT ordine_id, data_ordine
      FROM ordini
      WHERE cliente_id = $1 AND stato = 'non pagato'
      LIMIT 1
    `, [userId]);

    if (ordineResult.rowCount === 0) {
      return res.status(404).json({ message: 'Nessun carrello trovato.' });
    }

    const ordine = ordineResult.rows[0];

    /* 2. dettagli + prima immagine */
    const dettagliResult = await pool.query(`
      SELECT 
        d.prodotto_id,
        d.quantita,
        d.prezzo_unitario,
        (d.quantita * d.prezzo_unitario) AS totale,
        p.nome_prodotto,
        p.descrizione,
        i.immagine AS immagine_principale    -- BYTEA
      FROM dettagli_ordine d
      JOIN prodotti p ON d.prodotto_id = p.prodotto_id
      LEFT JOIN LATERAL (
        SELECT immagine
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id ASC
        LIMIT 1
      ) i ON true
      WHERE d.ordine_id = $1
    `, [ordine.ordine_id]);

    /* 3. converte la colonna BYTEA in base64 */
    const prodotti = dettagliResult.rows.map(r => ({
      ...r,
      immagine_principale: r.immagine_principale
        ? r.immagine_principale.toString('base64')
        : null
    }));

    const costo_totale = prodotti.reduce(
      (sum, p) => sum + parseFloat(p.totale),
      0
    );

    /* 4. risposta */
    res.status(200).json({
      ordine_id: ordine.ordine_id,
      data_ordine: ordine.data_ordine,
      stato: 'non pagato',
      costo_totale: costo_totale.toFixed(2),
      prodotti
    });
  } catch (error) {
    console.error('Errore recupero carrello:', error);
    res.status(500).json({ message: 'Errore del server.' });
  }
});


// GET storico ordini - protetta per cliente o admin
router.get('/storico', authMiddleware(1), async (req, res) => {
  const userId = req.user.id;
  const ruolo = req.user.ruolo_id;

  console.log("→ USER ID:", userId);
  console.log("→ RUOLO:", ruolo);

  try {
    let ordiniResult;

    if (ruolo === 3) {
      // Admin
      ordiniResult = await pool.query(`
        SELECT ordine_id, cliente_id, data_ordine, stato
        FROM ordini
        WHERE stato != 'non pagato'
        ORDER BY data_ordine DESC
      `);
    } else {
      // Cliente
      ordiniResult = await pool.query(`
        SELECT ordine_id, data_ordine, stato
        FROM ordini
        WHERE cliente_id = $1 AND stato != 'non pagato'
        ORDER BY data_ordine DESC
      `, [userId]);
    }

    res.status(200).json(ordiniResult.rows);

  } catch (error) {
    console.error('Errore nel recupero ordini utente:', error.stack);
    res.status(500).json({ message: 'Errore del server.' });
  }
});


// GET dettagli di un ordine - protetta per utente proprietario o admin
// GET dettagli di un ordine
router.get('/:id', authMiddleware(1), async (req, res) => {
  const ordine_id = req.params.id;
  const user_id   = req.user.id;
  const ruolo     = req.user.ruolo_id;

  try {
    /* 1. info ordine */
    const ordineResult = await pool.query(
      `SELECT ordine_id, cliente_id, data_ordine, stato
       FROM ordini
       WHERE ordine_id = $1`,
      [ordine_id]
    );

    if (ordineResult.rowCount === 0)
      return res.status(404).json({ message: 'Ordine non trovato.' });

    const ordine = ordineResult.rows[0];

    if (ordine.cliente_id !== user_id && ruolo !== 3)
      return res.status(403).json({ message: 'Non autorizzato a visualizzare questo ordine.' });

    /* 2. dettagli + prima immagine (BYTEA) */
    const dettagliResult = await pool.query(`
      SELECT 
        d.prodotto_id,
        d.quantita,
        d.prezzo_unitario,
        (d.quantita * d.prezzo_unitario) AS totale,
        p.nome_prodotto,
        p.descrizione,
        i.immagine AS immagine_principale        -- BYTEA
      FROM dettagli_ordine d
      JOIN prodotti p ON d.prodotto_id = p.prodotto_id
      LEFT JOIN LATERAL (
        SELECT immagine
        FROM immagini
        WHERE prodotto_id = p.prodotto_id
        ORDER BY immagine_id ASC
        LIMIT 1
      ) i ON true
      WHERE d.ordine_id = $1
    `, [ordine_id]);

    /* 3. converte il Buffer in stringa Base-64 */
    const prodotti = dettagliResult.rows.map(r => ({
      ...r,
      immagine_principale: r.immagine_principale
        ? r.immagine_principale.toString('base64')
        : null
    }));

    const costo_totale = prodotti.reduce(
      (sum, p) => sum + parseFloat(p.totale),
      0
    );

    /* 4. risposta */
    res.status(200).json({
      ordine_id: ordine.ordine_id,
      data_ordine: ordine.data_ordine,
      stato:      ordine.stato,
      costo_totale: costo_totale.toFixed(2),
      prodotti
    });

  } catch (error) {
    console.error('Errore nel recupero dettagli ordine:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero dell’ordine.' });
  }
});




// PATCH aggiorna stato ordine - protetta per cliente o admin

// NB - l'aggiornamento puó essere fatto solo in certe condizioni:
// - Cliente può aggiornare da "non pagato" a "in spedizione"
// - Cliente può aggiornare da "in spedizione" a "concluso" o "in controversia"
// - Admin può aggiornare da "in controversia" a "concluso"


router.patch('/:id', authMiddleware(1), async (req, res) => {
  const { id } = req.params;
  const { stato: nuovoStato } = req.body;
  const utente = req.user;

  const statiValidi = ['non pagato', 'in spedizione', 'in controversia', 'concluso'];
  if (!statiValidi.includes(nuovoStato)) {
    return res.status(400).json({ message: 'Stato non valido.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT stato, cliente_id FROM ordini WHERE ordine_id = $1`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: 'Ordine non trovato.' });

    const ordine = rows[0];
    const ruolo = utente.ruolo_id;
    const isCliente = ordine.cliente_id === utente.id;

    if (ruolo === 3) {
      if (!(ordine.stato === 'in controversia' && nuovoStato === 'concluso')) {
        return res.status(403).json({ message: 'Permesso negato per admin.' });
      }
    } else if (ruolo === 1 && isCliente) {
      if (
        !(
          (ordine.stato === 'non pagato' && nuovoStato === 'in spedizione') ||
          (ordine.stato === 'in spedizione' && ['concluso', 'in controversia'].includes(nuovoStato))
        )
      ) {
        return res.status(403).json({ message: 'Permesso negato per cliente.' });
      }
    } else {
      return res.status(403).json({ message: 'Permesso negato.' });
    }

    await pool.query(
      `UPDATE ordini SET stato = $1 WHERE ordine_id = $2`,
      [nuovoStato, id]
    );

    res.status(200).json({ message: 'Stato ordine aggiornato.' });
  } catch (error) {
    console.error('Errore aggiornamento stato ordine:', error);
    res.status(500).json({ message: 'Errore del server.' });
  }
});


// PATCH quantità prodotto nel carrello - cliente
router.patch('/carrello/:prodotto_id', authMiddleware(1), async (req, res) => {
  const cliente_id  = req.user.id;
  const prodotto_id = parseInt(req.params.prodotto_id, 10);
  const { quantita: nuovaQ } = req.body;

  if (!nuovaQ || nuovaQ < 1) {
    return res.status(400).json({ message: 'Quantità non valida.' });
  }

  try {
    await pool.query('BEGIN');

    // 1. trova ordine "non pagato"
    const ordRes = await pool.query(
      `SELECT ordine_id FROM ordini
       WHERE cliente_id = $1 AND stato = 'non pagato'
       LIMIT 1`,
      [cliente_id]
    );
    if (ordRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Carrello non trovato.' });
    }
    const ordine_id = ordRes.rows[0].ordine_id;

    // 2. quantità attuale
    const detRes = await pool.query(
      `SELECT quantita FROM dettagli_ordine
       WHERE ordine_id = $1 AND prodotto_id = $2
       FOR UPDATE`,
      [ordine_id, prodotto_id]
    );
    if (detRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Prodotto non nel carrello.' });
    }
    const attualeQ = detRes.rows[0].quantita;
    const delta    = nuovaQ - attualeQ;
    if (delta === 0) {
      await pool.query('ROLLBACK');
      return res.status(200).json({ message: 'Quantità invariata.' });
    }

    // 3. controlla stock
    const prodRes = await pool.query(
      `SELECT quant FROM prodotti
       WHERE prodotto_id = $1
       FOR UPDATE`,
      [prodotto_id]
    );
    const stock = prodRes.rows[0].quant;
    if (delta > 0 && stock < delta) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: `Disponibilità insufficiente (max ${stock}).` });
    }

    // 4. aggiorna dettaglio & stock
    await pool.query(
      `UPDATE dettagli_ordine
       SET quantita = $1
       WHERE ordine_id = $2 AND prodotto_id = $3`,
      [nuovaQ, ordine_id, prodotto_id]
    );

    await pool.query(
      `UPDATE prodotti
       SET quant = quant - $1
       WHERE prodotto_id = $2`,
      [delta, prodotto_id]            // delta può essere negativo
    );

    await pool.query('COMMIT');
    res.status(200).json({ message: 'Quantità aggiornata.' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Errore patch carrello:', err);
    res.status(500).json({ message: 'Errore del server.' });
  }
});


// DELETE prodotto dal carrello – cliente
router.delete('/carrello/:prodotto_id', authMiddleware(1), async (req, res) => {
  const cliente_id  = req.user.id;
  const prodotto_id = parseInt(req.params.prodotto_id, 10);

  try {
    await pool.query('BEGIN');

    /* trova ordine non pagato */
    const ordRes = await pool.query(
      `SELECT ordine_id FROM ordini
       WHERE cliente_id = $1 AND stato = 'non pagato'
       LIMIT 1`,
      [cliente_id]
    );
    if (ordRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Carrello non trovato.' });
    }
    const ordine_id = ordRes.rows[0].ordine_id;

    /* ① quantità da restituire a stock */
    const detRes = await pool.query(
      `SELECT quantita FROM dettagli_ordine
       WHERE ordine_id = $1 AND prodotto_id = $2
       FOR UPDATE`,
      [ordine_id, prodotto_id]
    );
    if (detRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Prodotto non nel carrello.' });
    }
    const quantitaDaRestituire = detRes.rows[0].quantita;

    /* elimina il dettaglio */
    await pool.query(
      `DELETE FROM dettagli_ordine
       WHERE ordine_id = $1 AND prodotto_id = $2`,
      [ordine_id, prodotto_id]
    );

    /* ② restituisce la quantità allo stock */
    await pool.query(
      `UPDATE prodotti
       SET quant = quant + $1
       WHERE prodotto_id = $2`,
      [quantitaDaRestituire, prodotto_id]
    );

    await pool.query('COMMIT');
    res.status(200).json({ message: 'Prodotto rimosso dal carrello.' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Errore rimozione carrello:', err);
    res.status(500).json({ message: 'Errore del server.' });
  }
});


// DELETE ordine — protetta per admin
router.delete('/:ordine_id', authMiddleware(0), async (req, res) => {
  const { ordine_id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM ordini WHERE ordine_id = $1 RETURNING *',
      [ordine_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Ordine non trovato' });
    }

    res.status(200).json({ message: 'Ordine cancellato correttamente' });
  } catch (error) {
    console.error('Errore nella cancellazione ordine:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});
module.exports = router;