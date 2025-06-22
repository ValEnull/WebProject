const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const pool = require('../db/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

let adminToken, clienteToken, artigianoToken;
let adminId, clienteId, artigianoId;

describe('/api/users', () => {

  before(async () => {
    await pool.query('DELETE FROM artigiani');
    await pool.query('DELETE FROM utenti');

    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const clientePass = await bcrypt.hash('cliente123', salt);
    const artigianoPass = await bcrypt.hash('arti123', salt);

    // Inserimento utenti
    const admin = await pool.query(
      `INSERT INTO utenti (nome_utente, nome, cognome, email, password_hash, ruolo_id)
       VALUES ('adminTest', 'Admin', 'One', 'admin@test.com', $1, 3)
       RETURNING id`, [adminPass]);

    adminId = admin.rows[0].id;
    adminToken = jwt.sign({ id: adminId, ruolo_id: 3 }, process.env.JWT_SECRET);

    const cliente = await pool.query(
      `INSERT INTO utenti (nome_utente, nome, cognome, email, password_hash, ruolo_id)
       VALUES ('clienteTest', 'Mario', 'Rossi', 'cliente@test.com', $1, 1)
       RETURNING id`, [clientePass]);

    clienteId = cliente.rows[0].id;
    clienteToken = jwt.sign({ id: clienteId, ruolo_id: 1 }, process.env.JWT_SECRET);

    const artigiano = await pool.query(
      `INSERT INTO utenti (nome_utente, nome, cognome, email, password_hash, ruolo_id)
       VALUES ('artiTest', 'Giulia', 'Ferro', 'arti@test.com', $1, 2)
       RETURNING id`, [artigianoPass]);

    artigianoId = artigiano.rows[0].id;
    artigianoToken = jwt.sign({ id: artigianoId, ruolo_id: 2 }, process.env.JWT_SECRET);

    await pool.query(
      `INSERT INTO artigiani (artigiano_id, p_iva, cap)
       VALUES ($1, '12345678901', 21050)`, [artigianoId]);
  });

  describe('GET /api/users', () => {
    it('admin può ottenere la lista utenti', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body.length).to.be.greaterThanOrEqual(3);
    });

    it('cliente NON può accedere (403)', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${clienteToken}`)
        .expect(403);
    });

    it('senza token → 401', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('admin può leggere profilo di un altro utente', async () => {
      const res = await request(app)
        .get(`/api/users/${clienteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.include({ id: clienteId, nome_utente: 'clienteTest' });
    });

    it('404 se ID non esiste', async () => {
      await request(app)
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('cliente modifica il proprio profilo', async () => {
      const res = await request(app)
        .patch(`/api/users/${clienteId}`)
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ nome: 'MarioModificato' })
        .expect(200);

      expect(res.body.nome).to.equal('MarioModificato');
    });

    it('cliente NON può modificare altri (403)', async () => {
      await request(app)
        .patch(`/api/users/${adminId}`)
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ nome: 'Hackerato' })
        .expect(403);
    });
  });

  describe('PATCH /api/users/:id/password', () => {
    it('cliente cambia password con successo', async () => {
      await request(app)
        .patch(`/api/users/${clienteId}/password`)
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ oldPassword: 'cliente123', newPassword: 'nuovo123' })
        .expect(204);

      const res = await request(app)
        .post('/api/users/login')
        .send({ nome_utente: 'clienteTest', password: 'nuovo123' })
        .expect(200);

      expect(res.body).to.have.property('token');
    });
  });

  describe('PATCH /api/users/:id/ban', () => {
    it('admin banna un artigiano', async () => {
      const res = await request(app)
        .patch(`/api/users/${artigianoId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ is_banned: true })
        .expect(200);

      expect(res.body.user.is_banned).to.equal(true);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('cliente elimina sé stesso', async () => {
      const res = await request(app)
        .delete(`/api/users/${clienteId}`)
        .set('Authorization', `Bearer ${clienteToken}`)
        .expect(200);

      expect(res.body.message).to.equal('Utente eliminato con successo');
    });
  });

});
