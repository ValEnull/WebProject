const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const authMiddleware = require('../middleware/auth');

// POST ordine - protetta per cliente - Aggiunta al carrello 
router.post('/:prodotto_id', authMiddleware(1), async (req, res) => {
  const utenteId = req.user.id;
  const prodottoId = parseInt(req.params.prodotto_id, 10);
  const { quantita } = req.body;

  if (!prodottoId || !quantita || quantita <= 0) {
    return res.status(400).json({ message: 'ID prodotto e quantità validi richiesti.' });
  }

  try {
    await pool.query('BEGIN');

    // 1. Verifica se l'utente ha già un carrello (ordine non pagato)
    const ordineResult = await pool.query(`
      SELECT ordine_id FROM ordini 
      WHERE cliente_id = $1 AND stato = 'non pagato'
      LIMIT 1
    `, [utenteId]);

    let ordineId;

    if (ordineResult.rowCount === 0) {
      // 2. Nessun ordine aperto: creane uno
      const nuovoOrdine = await pool.query(`
        INSERT INTO ordini (cliente_id, stato) 
        VALUES ($1, 'non pagato') 
        RETURNING ordine_id
      `, [utenteId]);
      ordineId = nuovoOrdine.rows[0].ordine_id;
    } else {
      ordineId = ordineResult.rows[0].ordine_id;
    }

    // 3. Inserisci o aggiorna il prodotto nei dettagli
    const dettaglioResult = await pool.query(`
      SELECT * FROM dettagli_ordini
      WHERE ordine_id = $1 AND prodotto_id = $2
    `, [ordineId, prodottoId]);

    if (dettaglioResult.rowCount > 0) {
      // Se esiste già, aggiorna la quantità
      await pool.query(`
        UPDATE dettagli_ordini
        SET quantita = quantita + $1
        WHERE ordine_id = $2 AND prodotto_id = $3
      `, [quantita, ordineId, prodottoId]);
    } else {
      // Altrimenti, inserisci
      await pool.query(`
        INSERT INTO dettagli_ordini (ordine_id, prodotto_id, quantita)
        VALUES ($1, $2, $3)
      `, [ordineId, prodottoId, quantita]);
    }

    await pool.query('COMMIT');

    res.status(201).json({ message: 'Prodotto aggiunto al carrello.', ordine_id: ordineId });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Errore aggiunta prodotto al carrello:', error);
    res.status(500).json({ message: 'Errore del server.' });
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

// GET degli oridni - protetta per cliente (ottiene solo i propri ordini) o admin (ottiene tutti gli ordini)
router.get('/user', authMiddleware(1), async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.ruolo_id;

  try {
    let query;
    let params = [];

    if (userRole === 3) { // admin
      query = `
        SELECT o.*, u.nome_utente
        FROM ordini o
        JOIN utenti u ON o.cliente_id = u.id
        ORDER BY o.data_ordine DESC
      `;
    } else {
      query = `
        SELECT o.*, u.nome_utente
        FROM ordini o
        JOIN utenti u ON o.cliente_id = u.id
        WHERE o.cliente_id = $1
        ORDER BY o.data_ordine DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Errore nel recupero degli ordini:', error);
    res.status(500).json({ message: 'Errore del server durante il recupero degli ordini.' });
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
          (ordine.stato === 'in spedizione')
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