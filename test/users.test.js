/* eslint-disable no-undef */
require('./setup');          // reset/seed globale

const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');
const app  = require('../server');

let adminTok, cliTok, artTok;
let adminId , cliId , artId ;

before(async () => {
  // Crea tre account dedicati ai test
  const salt   = await bcrypt.genSalt(10);
  const passAd = await bcrypt.hash('adminX', salt);
  const passCl = await bcrypt.hash('cliX',   salt);
  const passAr = await bcrypt.hash('artX',   salt);

  const rA = await pool.query(
    `INSERT INTO utenti (nome_utente,nome,cognome,email,password_hash,ruolo_id)
     VALUES ('adminTest','Admin','One','adm@test.com',$1,3) RETURNING id`, [passAd]);
  adminId  = rA.rows[0].id;
  adminTok = jwt.sign({ id: adminId, ruolo_id: 3 }, process.env.JWT_SECRET);

  const rC = await pool.query(
    `INSERT INTO utenti (nome_utente,nome,cognome,email,password_hash,ruolo_id)
     VALUES ('cliTest','Mario','Rossi','cli@test.com',$1,1) RETURNING id`, [passCl]);
  cliId  = rC.rows[0].id;
  cliTok = jwt.sign({ id: cliId, ruolo_id: 1 }, process.env.JWT_SECRET);

  const rR = await pool.query(
    `INSERT INTO utenti (nome_utente,nome,cognome,email,password_hash,ruolo_id)
     VALUES ('artTest','Giulia','Ferro','art@test.com',$1,2) RETURNING id`, [passAr]);
  artId  = rR.rows[0].id;
  artTok = jwt.sign({ id: artId, ruolo_id: 2 }, process.env.JWT_SECRET);

  // aggiungi record artigiani
  await pool.query(
    `INSERT INTO artigiani (artigiano_id,p_iva,cap) VALUES ($1,'11111111111',21050)`, [artId]);
});

describe('/api/users', () => {

  describe('GET /api/users', () => {
    it('admin lista utenti', async () => {
      const r = await request(app).get('/api/users')
        .set('Authorization', `Bearer ${adminTok}`).expect(200);
      expect(r.body.length).to.be.greaterThan(2);
    });
    it('cliente 403', () =>
      request(app).get('/api/users')
        .set('Authorization', `Bearer ${cliTok}`).expect(403));
    it('no token 401', () =>
      request(app).get('/api/users').expect(401));
  });

  describe('GET /api/users/:id', () => {
    it('admin legge altro', async () => {
      const r = await request(app)
        .get(`/api/users/${cliId}`)
        .set('Authorization', `Bearer ${adminTok}`).expect(200);
      expect(r.body.id).to.equal(cliId);
    });
    it('404 se ID inesistente',
      () => request(app)
        .get('/api/users/999999')
        .set('Authorization', `Bearer ${adminTok}`).expect(404));
  });

  describe('PATCH /api/users/:id', () => {
    it('cliente self-patch', async () => {
      const r = await request(app)
        .patch(`/api/users/${cliId}`)
        .set('Authorization', `Bearer ${cliTok}`)
        .send({ nome: 'MarioX' }).expect(200);
      expect(r.body.nome).to.equal('MarioX');
    });
    it('cliente patch altro → 403',
      () => request(app)
        .patch(`/api/users/${adminId}`)
        .set('Authorization', `Bearer ${cliTok}`)
        .send({ nome: 'hack' }).expect(403));
  });

  describe('PATCH /api/users/:id/password', () => {
    it('cliente cambia pwd', async () => {
      await request(app)
        .patch(`/api/users/${cliId}/password`)
        .set('Authorization', `Bearer ${cliTok}`)
        .send({ oldPassword: 'cliX', newPassword: 'cliY' }).expect(204);
      await request(app)
        .post('/api/users/login')
        .send({ nome_utente: 'cliTest', password: 'cliY' }).expect(200);
    });
  });

  describe('PATCH /api/users/:id/ban', () => {
    it('admin banna artigiano', async () => {
      const r = await request(app)
        .patch(`/api/users/${artId}/ban`)
        .set('Authorization', `Bearer ${adminTok}`)
        .send({ is_banned: true }).expect(200);
      expect(r.body.user.is_banned).to.equal(true);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('cliente delete self', async () => {
      const r = await request(app)
        .delete(`/api/users/${cliId}`)
        .set('Authorization', `Bearer ${cliTok}`)
        .expect(200);
      expect(r.body.message).to.include('eliminato');
    });
  });
});