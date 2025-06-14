const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/db');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Rotta per la registrazione degli utenti

router.post('/register', async (req, res) => {
  const {
    nome_utente,
    nome,
    cognome,
    email,
    password,
    isArtigiano,
    p_iva,
    CAP
  } = req.body;

  // Campi obbligatori per tutti
  if (!nome_utente || !nome || !cognome || !email || !password) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
  }

  // Campi obbligatori solo per artigiani
  if (isArtigiano) {
    if (!p_iva || !CAP) {
      return res.status(400).json({ error:'Partita IVA e CAP sono obbligatori per gli artigiani.' });
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
        INSERT INTO artigiani (artigiano_id, p_iva, CAP)
        VALUES ($1, $2, $3)
      `;
      const artisanValues = [userId, p_iva, CAP];
      await pool.query(artisanInsertQuery, artisanValues);
    }

    res.status(201).json({ message: 'Utente registrato con successo', userId });

  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ error: 'Errore del server durante la registrazione' });
  }
});

// Rotta per registrazione admin

router.post('/register-admin', async (req, res) => {
  const { nome_utente, nome, cognome, email, password } = req.body;

  if (!nome_utente || !nome || !cognome || !email || !password) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
  }

  try {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const ruolo_id = 3; // ADMIN

    const query = `
      INSERT INTO utenti (nome_utente, nome, cognome, email, password_hash, ruolo_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const values = [nome_utente, nome, cognome, email, password_hash, ruolo_id];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Admin creato con successo',
      adminId: result.rows[0].id
    });

  } catch (error) {
    console.error('Errore registrazione admin:', error);
    res.status(500).json({ error: 'Errore del server durante la creazione dell\'admin' });
  }
});

// Rotta per login

router.post('/login', async (req, res) => {
  const { nome_utente, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM utenti WHERE nome_utente = $1', [nome_utente]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Nome utente o password errati' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Nome utente o password errati' });
    }

    const payload = {
      id: user.id,
      nome: user.nome,
      cognome: user.cognome,
      nome_utente: user.nome_utente,
      email: user.email,
      ruolo_id: user.ruolo_id
    };

    if (user.ruolo_id === 2) {
      const artisanResult = await pool.query('SELECT p_iva, CAP FROM artigiani WHERE artigiano_id = $1', [user.id]);
      if (artisanResult.rows.length > 0) {
        const artisan = artisanResult.rows[0];
        payload.p_iva = artisan.p_iva;
        payload.CAP = artisan.CAP; 
      }
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      token,
      user: payload
    });

  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
});

// GET urenti
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM utenti');
    res.json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero utenti:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET artigiani
router.get('/artisans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM artigiani');
    res.json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero artigiani:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET utente per ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM utenti WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore nel recupero utente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// GET artigiano per ID
router.get('/artisans/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM artigiani WHERE artigiano_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Artigiano non trovato' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore nel recupero artigiano:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PATCH utente
router.patch('/:id', async (req, res) => {
  const { nome_utente, nome, cognome, email, ruolo_id } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE utenti
      SET
        nome_utente = COALESCE($1, nome_utente),
        nome = COALESCE($2, nome),
        cognome = COALESCE($3, cognome),
        email = COALESCE($4, email),
        ruolo_id = COALESCE($5, ruolo_id)
      WHERE id = $6
      RETURNING *
      `,
      [nome_utente, nome, cognome, email, ruolo_id, req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Errore aggiornamento utente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PATCH artigiano
router.patch('/artisans/:id', async (req, res) => {
  const { p_iva, CAP } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE artigiani
      SET
        p_iva = COALESCE($1, p_iva),
        CAP = COALESCE($2, CAP)
      WHERE artigiano_id = $3
      RETURNING *
      `,
      [p_iva, CAP, req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Artigiano non trovato' });
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Errore aggiornamento artigiano:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE utente
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM utenti WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Utente non trovato' });
    res.json({ message: 'Utente eliminato con successo', user: result.rows[0] });
  } catch (error) {
    console.error('Errore eliminazione utente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE artigiano
router.delete('/artisans/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM artigiani WHERE artigiano_id = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Artigiano non trovato' });
    res.json({ message: 'Artigiano eliminato con successo', artisan: result.rows[0] });
  } catch (error) {
    console.error('Errore eliminazione artigiano:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

module.exports = router;