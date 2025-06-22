const express = require('express');
const router  = express.Router();
const pool    = require('../db/db');
const authMiddleware = require('../middleware/auth');

/**************************************************************************
 * ORDERS API (v2 – split al checkout)
 *
 * ◼  Un solo «ordine non pagato» = carrello per ciascun cliente.
 * ◼  Quando lo stato passa a “in spedizione”, l’ordine‑carrello viene
 *    suddiviso in tanti ordini quanti sono i prodotti contenuti.
 *
 * End‑points invariati rispetto alla v1, a parte la logica di PATCH /:id.
 **************************************************************************/

//----------------------------------------------------------------------//
// POST /carrello/:prodotto_id  – aggiunge o aggiorna un prodotto nel carrello
//----------------------------------------------------------------------//
router.post('/carrello/:prodotto_id', authMiddleware(1), async (req, res) => {
  const clienteId  = req.user.id;
  const prodottoId = +req.params.prodotto_id;
  const { quantita } = req.body;

  if (!prodottoId || !quantita || quantita <= 0)
    return res.status(400).json({ message: 'ID prodotto e quantità validi richiesti.' });

  try {
    await pool.query('BEGIN');

    const cartRes = await pool.query(
      `SELECT ordine_id FROM ordini WHERE cliente_id = $1 AND stato = 'non pagato' LIMIT 1`,
      [clienteId]
    );
    const cartId = cartRes.rowCount
      ? cartRes.rows[0].ordine_id
      : (await pool.query(
          `INSERT INTO ordini (cliente_id, stato) VALUES ($1,'non pagato') RETURNING ordine_id`,
          [clienteId]
        )).rows[0].ordine_id;

    const pRes = await pool.query(
      `SELECT prezzo, quant FROM prodotti WHERE prodotto_id = $1 FOR UPDATE`,
      [prodottoId]
    );
    if (!pRes.rowCount) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ message: 'Prodotto non trovato.' });
    }
    const { prezzo: prezzoUnit, quant: stock } = pRes.rows[0];

    const dRes = await pool.query(
      `SELECT quantita FROM dettagli_ordine WHERE ordine_id = $1 AND prodotto_id = $2`,
      [cartId, prodottoId]
    );
    const inCart = dRes.rowCount ? dRes.rows[0].quantita : 0;
    const nuovaQ = inCart + quantita;
    if (nuovaQ > stock) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: `Disponibilità insufficiente (max ${stock}).` });
    }

    if (inCart) {
      await pool.query(
        `UPDATE dettagli_ordine SET quantita = $1 WHERE ordine_id = $2 AND prodotto_id = $3`,
        [nuovaQ, cartId, prodottoId]
      );
    } else {
      await pool.query(
        `INSERT INTO dettagli_ordine (ordine_id, prodotto_id, quantita, prezzo_unitario)
         VALUES ($1,$2,$3,$4)`,
        [cartId, prodottoId, quantita, prezzoUnit]
      );
    }

    await pool.query(`UPDATE prodotti SET quant = quant - $1 WHERE prodotto_id = $2`, [quantita, prodottoId]);

    await pool.query('COMMIT');
    res.status(201).json({ message: 'Prodotto aggiunto al carrello.', ordine_id: cartId });
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('POST /carrello', e);
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
        SELECT ordine_id, cliente_id, data_ordine, stato, indirizzo_di_consegna
        FROM ordini
        WHERE stato != 'non pagato'
        ORDER BY data_ordine DESC
      `);
    } else {
      // Cliente
      ordiniResult = await pool.query(`
        SELECT ordine_id, data_ordine, stato, indirizzo_di_consegna
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


/* --------------------------------------------------------------- *
 * GET /api/orders/venditore – lista ordini che includono prodotti
 *                             di questo venditore (ruolo 2)
 * --------------------------------------------------------------- */
router.get('/venditore', authMiddleware(2), async (req, res) => {
  const venditoreId = req.user.id;           // l’id del venditore ⬅ token JWT
  try {
    const { rows } = await pool.query(`
      SELECT
        o.ordine_id,
        o.data_ordine,
        o.stato,
        o.indirizzo_di_consegna,
        SUM(d.quantita)                           AS tot_pezzi,
        SUM(d.quantita * d.prezzo_unitario)       AS tot_importo
      FROM ordini           o
      JOIN dettagli_ordine  d ON d.ordine_id   = o.ordine_id
      JOIN prodotti         p ON p.prodotto_id = d.prodotto_id
      WHERE p.artigiano_id = $1
        AND o.stato <> 'non pagato'
      GROUP BY o.ordine_id, o.data_ordine, o.stato
      ORDER BY o.data_ordine DESC;
    `, [venditoreId]);

    res.json(rows);
  } catch (err) {
    console.error('GET /orders/venditore', err);
    res.status(500).json({ message: 'Errore del server.' });
  }
});

//* ====================================================== STATISTICHE */

/* --- Top-5 prodotti per pezzi complessivi venduti --------------- */
/*    Restituisce:  prodotto_id · totale_pezzi · fatturato          */
router.get('/top-sellers', async (_req, res) => {
  try {
  const { rows } = await pool.query(`
    SELECT
      d.prodotto_id,
      p.nome_prodotto,
      t.nome_tipologia,
      SUM(d.quantita)                      AS totale_pezzi,
      SUM(d.quantita * d.prezzo_unitario) AS fatturato
    FROM dettagli_ordine d
    JOIN prodotti p     ON d.prodotto_id = p.prodotto_id
    JOIN tipologia t    ON p.tipologia_id = t.tipologia_id
    GROUP BY d.prodotto_id, p.nome_prodotto, t.nome_tipologia
    ORDER BY totale_pezzi DESC
    LIMIT 10
  `);
    res.json(rows);
  } catch (err) {
    console.error('Errore top-seller:', err);
    res.status(500).json({ message: 'Errore del server.' });
  }
});


/* --- Fatturato (e ordini) per giorno ---------------------------- */
/*    Restituisce:  giorno · ordini · pezzi · fatturato            */
router.get('/daily-metrics', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        DATE(o.data_ordine)                          AS giorno,
        COUNT(DISTINCT o.ordine_id)                  AS ordini,
        SUM(d.quantita)                             AS pezzi,
        SUM(d.quantita * d.prezzo_unitario)         AS fatturato
      FROM ordini          o
      JOIN dettagli_ordine d ON d.ordine_id = o.ordine_id
      WHERE o.stato <> 'non pagato'                 -- esclude i carrelli
      GROUP BY giorno
      ORDER BY giorno DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Errore daily-metrics:', err);
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
      `SELECT ordine_id, cliente_id, data_ordine, stato, indirizzo_di_consegna
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
      indirizzo: ordine.indirizzo_di_consegna,
      costo_totale: costo_totale.toFixed(2),
      prodotti
    });

  } catch (error) {
    console.error('Errore nel recupero dettagli ordine:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero dell’ordine.' });
  }
});





/* ────────────────────────────────────────────────────────────────
 * PATCH /api/orders/:id
 * Aggiorna lo stato di un ordine (protetto) e — se si passa
 * da “non pagato” a “in spedizione” — suddivide il carrello
 * creando un ordine distinto per ogni prodotto.
 * ──────────────────────────────────────────────────────────────── */
router.patch('/:id', authMiddleware(1), async (req, res) => {
  const { id } = req.params;
  const { stato: nuovoStato, indirizzo_di_consegna } = req.body;
  const utente = req.user;

  const STATI_AMMESSI = ['non pagato', 'in spedizione',
                         'in controversia', 'concluso'];
  if (!STATI_AMMESSI.includes(nuovoStato)) {
    return res.status(400).json({ message: 'Stato non valido.' });
  }

  try {
    /* ------------------------------------------------------------------
     * 1. Recupero ordine + controllo esistenza
     * ------------------------------------------------------------------ */
    const { rows } = await pool.query(
      `SELECT stato, cliente_id
         FROM ordini
        WHERE ordine_id = $1`,
      [id]
    );
    if (!rows.length)
      return res.status(404).json({ message: 'Ordine non trovato.' });

    const ordine    = rows[0];
    const ruolo     = utente.ruolo_id;          // 1-cliente | 3-admin
    const isCliente = ordine.cliente_id === utente.id;

    /* ------------------------------------------------------------------
     * 2. Autorizzazioni (stessa logica di prima)
     * ------------------------------------------------------------------ */
    if (ruolo === 3) {                 // admin
      if (!(ordine.stato === 'in controversia' && nuovoStato === 'concluso'))
        return res.status(403).json({ message: 'Permesso negato per admin.' });
    } else if (ruolo === 1 && isCliente) {      // cliente
      const ok =
        (ordine.stato === 'non pagato'  && nuovoStato === 'in spedizione') ||
        (ordine.stato === 'in spedizione'
          && ['concluso', 'in controversia'].includes(nuovoStato));
      if (!ok)
        return res.status(403).json({ message: 'Permesso negato per cliente.' });
    } else {
      return res.status(403).json({ message: 'Permesso negato.' });
    }

    /* ------------------------------------------------------------------
     * 3. SPLIT ORDINE  (carrello ➜ spedizione per prodotto)
     * ------------------------------------------------------------------ */
    if (ordine.stato === 'non pagato' && nuovoStato === 'in spedizione') {
      // 3-a. check indirizzo
      if (!indirizzo_di_consegna || indirizzo_di_consegna.trim().length < 5)
        return res.status(400).json({ message: 'Indirizzo di consegna non valido.' });

      try {
        await pool.query('BEGIN');

        // 3-b. Dettagli del vecchio ordine (carrello)
        const det = await pool.query(
          `SELECT prodotto_id, quantita, prezzo_unitario
             FROM dettagli_ordine
            WHERE ordine_id = $1`,
          [id]
        );
        if (det.rowCount === 0) {
          await pool.query('ROLLBACK');
          return res.status(400).json({ message: 'Carrello vuoto.' });
        }

        const nuoviOrdini = [];

        // 3-c. Per ciascun prodotto  ➜  nuovo ordine + dettaglio
        for (const r of det.rows) {
          const oRes = await pool.query(
            `INSERT INTO ordini (cliente_id, stato, indirizzo_di_consegna)
             VALUES ($1, 'in spedizione', $2)
             RETURNING ordine_id`,
            [utente.id, indirizzo_di_consegna.trim()]
          );
          const nuovoOrdineId = oRes.rows[0].ordine_id;

          await pool.query(
            `INSERT INTO dettagli_ordine
                    (ordine_id, prodotto_id, quantita, prezzo_unitario)
             VALUES ($1, $2, $3, $4)`,
            [nuovoOrdineId, r.prodotto_id, r.quantita, r.prezzo_unitario]
          );

          nuoviOrdini.push(nuovoOrdineId);
        }

        // 3-d. Elimina il carrello originario
        await pool.query(`DELETE FROM dettagli_ordine WHERE ordine_id = $1`, [id]);
        await pool.query(`DELETE FROM ordini          WHERE ordine_id = $1`, [id]);

        await pool.query('COMMIT');
        return res.status(200).json({
          message: 'Ordine suddiviso con successo.',
          ordini_generati: nuoviOrdini
        });
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Errore split-ordine:', err);
        return res.status(500).json({ message: 'Errore durante la creazione degli ordini.' });
      }
    }

    /* ------------------------------------------------------------------
     * 4. Altre transizioni di stato (senza split)
     * ------------------------------------------------------------------ */
    await pool.query(
      `UPDATE ordini
          SET stato = $1
        WHERE ordine_id = $2`,
      [nuovoStato, id]
    );

    return res.status(200).json({ message: 'Stato ordine aggiornato.' });
  } catch (error) {
    console.error('Errore aggiornamento stato ordine:', error);
    return res.status(500).json({ message: 'Errore del server.' });
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
