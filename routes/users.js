const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/db');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');// Abilita CORS per tutte le rotte in questo router

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

  // Normalizza isArtigiano: accetta booleano o stringa 'true'
  const isArtigianoFlag = (isArtigiano === true) ||(typeof isArtigiano === 'string' && isArtigiano.toLowerCase() === 'true');
  // Campi obbligatori per tutti
  if (!nome_utente || !nome || !cognome || !email || !password) {
    return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati.' });
  }

  // Campi obbligatori solo per artigiani
  if (isArtigianoFlag) {
    if (!p_iva || !CAP) {
      return res.status(400).json({ error:'Partita IVA e CAP sono obbligatori per gli artigiani.' });
    }
  }

  try {
    // Cripta la password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Ruolo: 1 = cliente, 2 = artigiano
    const ruolo_id = isArtigianoFlag ? 2 : 1;

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
    if (isArtigianoFlag) {
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
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Nome utente o email già in uso.' });
    }
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

        // 3) **nuovo controllo ban**
    if (user.is_banned) {
      return res
        .status(403)
        .json({ message: 'Account sospeso.' });
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

// GET utenti
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



// GET /api/users?q=searchString  – elenco filtrato (solo admin)
router.get('/', authMiddleware(0), async (req, res) => {
  const { q } = req.query;                   // ?q=foo

  const where = [];
  const params = [];
  let idx = 1;

  if (q) {
    where.push(`(nome_utente ILIKE $${idx} OR email ILIKE $${idx})`);
    params.push(`%${q}%`);
    idx++;
  }

  const sql = `
    SELECT id,
           nome_utente,
           email,
           nome,
           cognome,
           ruolo_id,
           is_banned
    FROM   utenti
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY id
    LIMIT 50;`;                              // evita di sparare troppi record

  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Errore lista utenti:', err);
    res.status(500).json({ message: 'Errore del server.' });
  }
});



// GET /api/users/artisans/:id  → profilo completo artigiano
router.get('/artisans/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        u.id,
        u.nome_utente,
        u.nome,         
        u.cognome,
        u.email,
        a.p_iva,
        a.cap
      FROM   utenti    u
      JOIN   artigiani a ON a.artigiano_id = u.id
      WHERE  u.id = $1
      `,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Artigiano non trovato' });

    // mappa i campi come li aspetta il front-end
    const r = rows[0];
    res.json({
      id:            r.id,
      nome_azienda:  r.nome_utente,     
      email:         r.email,
      p_iva:         r.p_iva,
      cap:           r.cap
    });
  } catch (err) {
    console.error('Errore recupero artigiano:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/users/:id  ─ modifica nome_utente, nome, cognome, email (uno o più)
// -----------------------------------------------------------------------------
router.patch('/:id', authMiddleware(1), async (req, res) => {
  const { nome_utente, nome, cognome, email } = req.body;
  const { id } = req.params;

  // vieta di modificare altri account
  if (+id !== req.user.id) return res.status(403).json({ error: 'Operazione non consentita' });

  try {
    const { rows, rowCount } = await pool.query(
      `
      UPDATE utenti
      SET
        nome_utente = COALESCE($1, nome_utente),
        nome        = COALESCE($2, nome),
        cognome     = COALESCE($3, cognome),
        email       = COALESCE($4, email)
      WHERE id = $5
      RETURNING id, nome_utente, nome, cognome, email;
      `,
      [nome_utente, nome, cognome, email, id]
    );

    if (!rowCount) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore aggiornamento utente:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/users/:id/email  ─ modifica solo email
// -----------------------------------------------------------------------------
router.patch('/:id/email', authMiddleware(1), async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  if (+id !== req.user.id) return res.status(403).json({ error: 'Operazione non consentita' });

  try {
    const { rows, rowCount } = await pool.query(
      'UPDATE utenti SET email = $1 WHERE id = $2 RETURNING id, nome_utente, nome, cognome, email;',
      [email, id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore aggiornamento email:', err);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/users/:id/password  ─ cambio password con verifica oldPassword
// -----------------------------------------------------------------------------
router.patch('/:id/password', authMiddleware(1), async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (+id !== req.user.id) return res.status(403).json({ error: 'Operazione non consentita' });

  try {
    const userRes = await pool.query('SELECT password_hash FROM utenti WHERE id = $1;', [id]);
    if (!userRes.rowCount) return res.status(404).json({ error: 'Utente non trovato' });

    const match = await bcrypt.compare(oldPassword, userRes.rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Password attuale errata' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE utenti SET password_hash = $1 WHERE id = $2;', [hashed, id]);

    res.sendStatus(204);
  } catch (err) {
    console.error('Errore cambio password:', err);
    res.status(500).json({ error: 'Errore del server' });
  }
});



// PATCH artigiano - protetta per artigiano proprietario
router.patch('/artisans/:id', authMiddleware(2), async (req, res) => {
  const { p_iva, CAP } = req.body;
  const { id } = req.params;

  if (parseInt(id) !== req.user.id) {
    return res.status(403).json({ error: 'Non puoi modificare i dati di un altro artigiano' });
  }

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
      [p_iva, CAP, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artigiano non trovato' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Errore aggiornamento artigiano:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE utente - protetta per utente proprietario o admin
router.delete('/:id', authMiddleware(1), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.ruolo_id;

  if (parseInt(id) !== userId && userRole !== 3) {
    return res.status(403).json({ error: 'Non autorizzato a eliminare questo utente' });
  }

  try {
    const result = await pool.query('DELETE FROM utenti WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Utente non trovato' });
    res.json({ message: 'Utente eliminato con successo', user: result.rows[0] });
  } catch (error) {
    console.error('Errore eliminazione utente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// DELETE artigiano - protetta per artigiano proprietario o admin
router.delete('/artisans/:id', authMiddleware(2), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.ruolo_id;

  if (parseInt(id) !== userId && userRole !== 3) {
    return res.status(403).json({ error: 'Non autorizzato a eliminare questo artigiano' });
  }

  try {
    const result = await pool.query('DELETE FROM artigiani WHERE artigiano_id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Artigiano non trovato' });
    res.json({ message: 'Artigiano eliminato con successo', artisan: result.rows[0] });
  } catch (error) {
    console.error('Errore eliminazione artigiano:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// PATCH /api/users/:id/ban  – solo admin
router.patch('/:id/ban', authMiddleware(3), async (req, res) => {
  const { id } = req.params;
  const { is_banned } = req.body;          // boolean

  if (typeof is_banned !== 'boolean') {
    return res.status(400).json({ error: '`is_banned` deve essere booleano' });
  }

  try {
    await pool.query('BEGIN');

    // 1) aggiorno lo stato dell’utente
    const userRes = await pool.query(
      `UPDATE utenti
         SET is_banned = $2
       WHERE id = $1
       RETURNING id, ruolo_id, nome_utente, is_banned`,
      [id, is_banned]
    );

    if (!userRes.rowCount) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const user = userRes.rows[0];

    // 2) se artigiano bannato → azzero lo stock dei suoi prodotti
    if (is_banned && user.ruolo_id === 2) {
      await pool.query(
        'UPDATE prodotti SET quant = 0 WHERE artigiano_id = $1',
        [id]
      );
    }

    await pool.query('COMMIT');
    res.json({
      message: `Utente ${is_banned ? 'bannato' : 'sbannato'} con successo`,
      user
    });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Errore aggiornamento ban:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});


module.exports = router;