const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/db');
const router = express.Router();

router.post('/register', async (req, res) => {
  const {
    nome_utente,
    nome,
    cognome,
    email,
    password,
    isArtigiano,
    tipologia_id,
    p_iva,
    cap
  } = req.body;

  // Campi obbligatori per tutti
  if (!nome_utente || !nome || !cognome || !email || !password) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
  }

  // Campi obbligatori solo per artigiani
  if (isArtigiano) {
    if (!tipologia_id || !p_iva || !cap) {
      return res.status(400).json({ error: 'Tipologia, Partita IVA e CAP sono obbligatori per gli artigiani.' });
    }
  }

  try {
    // Cripta la password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Ruolo: 1 = cliente, 2 = artigiano
    const ruolo_id = isArtigiano ? 2 : 1;

    // Inserisci nella tabella utenti
    const userInsertQuery = `
      INSERT INTO utenti (nome_utente, nome, cognome, email, password_hash, ruolo_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const userValues = [nome_utente, nome, cognome, email, password_hash, ruolo_id];

    const result = await pool.query(userInsertQuery, userValues);
    const userId = result.rows[0].id;

    // Se artigiano, inserisci nella tabella artigiani
    if (isArtigiano) {
      const artisanInsertQuery = `
        INSERT INTO artigiani (artigiano_id, tipologia_id, p_iva, CAP)
        VALUES ($1, $2, $3, $4)
      `;
      const artisanValues = [userId, tipologia_id, p_iva, cap];
      await pool.query(artisanInsertQuery, artisanValues);
    }

    res.status(201).json({ message: 'Utente registrato con successo', userId });

  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ error: 'Errore del server durante la registrazione' });
  }
});

module.exports = router;