const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const authMiddleware = require('../middleware/auth');

// Crea ordine con stato "non pagato"
router.post('/', authMiddleware(1), async (req, res) => {
  const cliente_id = req.user.id;
  const { prodotti } = req.body;

  if (!Array.isArray(prodotti) || prodotti.length === 0) {
    return res.status(400).json({ message: 'Prodotti mancanti o formato non valido.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ordineResult = await client.query(
      `INSERT INTO ordini (cliente_id, stato)
       VALUES ($1, 'non pagato') RETURNING ordine_id`,
      [cliente_id]
    );
    const ordine_id = ordineResult.rows[0].ordine_id;

    for (const { prodotto_id, quantita } of prodotti) {
    const { rows } = await client.query(
        'SELECT prezzo, quant FROM prodotti WHERE prodotto_id = $1',
        [prodotto_id]
    );

    if (rows.length === 0) {
        throw new Error(`Prodotto ID ${prodotto_id} non trovato.`);
    }
    const { prezzo, quant } = rows[0];

    if (quant < quantita) {
        throw new Error(`Quantità non disponibile per prodotto ID ${prodotto_id}.`);
    }

    await client.query(
        `INSERT INTO dettagli_ordine
        (ordine_id, prodotto_id, quantita, prezzo_unitario)
        VALUES ($1,$2,$3,$4)`,
        [ordine_id, prodotto_id, quantita, prezzo]
    );

    await client.query(
        `UPDATE prodotti
        SET quant = quant - $1
        WHERE prodotto_id = $2`,
        [quantita, prodotto_id]
    );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Ordine creato', ordine_id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Errore creazione ordine:', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// GET dettagli di un ordine - protetta per utente proprietario o admin
router.get('/:id', authMiddleware(1), async (req, res) => {
  const ordine_id = req.params.id;
  const user_id = req.user.id;
  const ruolo = req.user.ruolo_id;

  try {
    const ordineResult = await pool.query(
      `SELECT ordine_id, cliente_id, data_ordine, stato
       FROM ordini
       WHERE ordine_id = $1`,
      [ordine_id]
    );

    if (ordineResult.rows.length === 0) {
      return res.status(404).json({ message: 'Ordine non trovato.' });
    }

    const ordine = ordineResult.rows[0];

    if (ordine.cliente_id !== user_id && ruolo !== 3) {
      return res.status(403).json({ message: 'Non autorizzato a visualizzare questo ordine.' });
    }

    const dettagliResult = await pool.query(
      `SELECT 
         d.prodotto_id, 
         d.quantita, 
         d.prezzo_unitario,
         (d.quantita * d.prezzo_unitario) AS totale,
         p.nome_prodotto, 
         p.descrizione,
         i.immagine_link AS immagine_principale
       FROM dettagli_ordine d
       JOIN prodotti p ON d.prodotto_id = p.prodotto_id
       LEFT JOIN LATERAL (
         SELECT immagine_link
         FROM immagini
         WHERE prodotto_id = p.prodotto_id
         ORDER BY immagine_id ASC
         LIMIT 1
       ) i ON true
       WHERE d.ordine_id = $1`,
      [ordine_id]
    );

    const prodotti = dettagliResult.rows;
    const costo_totale = prodotti.reduce((sum, p) => sum + parseFloat(p.totale), 0);

    res.status(200).json({
      ordine_id: ordine.ordine_id,
      data_ordine: ordine.data_ordine,
      stato: ordine.stato,
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
          (ordine.stato === 'in spedizione' &&
            (nuovoStato === 'concluso' || nuovoStato === 'in controversia'))
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

module.exports = router;