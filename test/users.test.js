// users.test.js – test completo
const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const pool = require('../db/db');
const app  = require('../server');
const { seed } = require('../db/seed');

const schemaPath = path.join(__dirname, '../db/schema.sql');

let adminToken, clienteToken, artigianoToken;
let adminId, clienteId, artigianoId;

async function recreateSchema() {
  const sql = await fs.readFile(schemaPath, 'utf8');
  await pool.query(sql);
}

async function dropTables() {
  await pool.query('SET session_replication_role = replica;');
  const t = ['immagini','recensioni','dettagli_ordine','ordini','prodotti','artigiani','utenti','tipologia','ruoli'];
  for (const tb of t) await pool.query(`DROP TABLE IF EXISTS ${tb} CASCADE;`);
  await pool.query('SET session_replication_role = origin;');
}

describe('/api/users', () => {
  before(async () => {
    await dropTables();
    await recreateSchema();
    await seed();

    const salt = await bcrypt.genSalt(10);
    const adminPass    = await bcrypt.hash('admin123',    salt);
    const clientePass  = await bcrypt.hash('cliente123',  salt);
    const artigianoPass= await bcrypt.hash('arti123',     salt);

    const resA = await pool.query(`INSERT INTO utenti (nome_utente,nome,cognome,email,password_hash,ruolo_id) VALUES ('adminTest','Admin','One','admin@test.com',$1,3) RETURNING id`,[adminPass]);
    adminId=resA.rows[0].id; adminToken=jwt.sign({id:adminId,ruolo_id:3},process.env.JWT_SECRET);

    const resC = await pool.query(`INSERT INTO utenti (nome_utente,nome,cognome,email,password_hash,ruolo_id) VALUES ('clienteTest','Mario','Rossi','cliente@test.com',$1,1) RETURNING id`,[clientePass]);
    clienteId=resC.rows[0].id; clienteToken=jwt.sign({id:clienteId,ruolo_id:1},process.env.JWT_SECRET);

    const resR = await pool.query(`INSERT INTO utenti (nome_utente,nome,cognome,email,password_hash,ruolo_id) VALUES ('artiTest','Giulia','Ferro','arti@test.com',$1,2) RETURNING id`,[artigianoPass]);
    artigianoId=resR.rows[0].id; artigianoToken=jwt.sign({id:artigianoId,ruolo_id:2},process.env.JWT_SECRET);

    await pool.query(`INSERT INTO artigiani (artigiano_id,p_iva,cap) VALUES ($1,'12345678901',21050)`,[artigianoId]);
  });

  describe('GET /api/users', ()=>{
    it('admin lista utenti',async()=>{
      const r=await request(app).get('/api/users').set('Authorization',`Bearer ${adminToken}`).expect(200);
      expect(r.body.length).to.be.greaterThan(2);
    });
    it('cliente 403',()=>request(app).get('/api/users').set('Authorization',`Bearer ${clienteToken}`).expect(403));
    it('no token 401',()=>request(app).get('/api/users').expect(401));
  });

  describe('GET /api/users/:id',()=>{
    it('admin legge altro',async()=>{
      const r=await request(app).get(`/api/users/${clienteId}`).set('Authorization',`Bearer ${adminToken}`).expect(200);
      expect(r.body.id).to.equal(clienteId);
    });
    it('404',()=>request(app).get('/api/users/99999').set('Authorization',`Bearer ${adminToken}`).expect(404));
  });

  describe('PATCH /api/users/:id',()=>{
    it('cliente self patch',async()=>{
      const r=await request(app).patch(`/api/users/${clienteId}`).set('Authorization',`Bearer ${clienteToken}`).send({nome:'MarioX'}).expect(200);
      expect(r.body.nome).to.equal('MarioX');
    });
    it('cliente patch altro 403',()=>request(app).patch(`/api/users/${adminId}`).set('Authorization',`Bearer ${clienteToken}`).send({nome:'hack'}).expect(403));
  });

  describe('PATCH /api/users/:id/password',()=>{
    it('cliente cambia pwd',async()=>{
      await request(app).patch(`/api/users/${clienteId}/password`).set('Authorization',`Bearer ${clienteToken}`).send({oldPassword:'cliente123',newPassword:'nuovo123'}).expect(204);
      await request(app).post('/api/users/login').send({nome_utente:'clienteTest',password:'nuovo123'}).expect(200);
    });
  });

  describe('PATCH /api/users/:id/ban',()=>{
    it('admin banna artigiano',async()=>{
      const r=await request(app).patch(`/api/users/${artigianoId}/ban`).set('Authorization',`Bearer ${adminToken}`).send({is_banned:true}).expect(200);
      expect(r.body.user.is_banned).to.equal(true);
    });
  });

  describe('DELETE /api/users/:id',()=>{
    it('cliente delete self',async()=>{
      const r=await request(app).delete(`/api/users/${clienteId}`).set('Authorization',`Bearer ${clienteToken}`).expect(200);
      expect(r.body.message).to.include('eliminato');
    });
  });

  after(async()=>{
    await dropTables();
    await recreateSchema();
    await seed();
    await pool.end();
  });
});
