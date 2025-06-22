const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');
const authMiddleware = require('../middleware/auth');   
require('dotenv').config();

const app = express();
app.get('/protected', authMiddleware(2), (req, res) => {
  res.json({ message: 'Accesso consentito', user: req.user });
});

describe('authMiddleware()', () => {

  it('deve restituire 401 se manca il token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).to.equal(401);
    expect(res.body.message).to.equal('Token mancante o non valido');
  });

  it('deve restituire 403 se il token è malformato', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer tokenNonValido');
    expect(res.status).to.equal(403);
    expect(res.body.message).to.equal('Token non valido o scaduto');
  });

  it('deve restituire 403 se il ruolo è troppo basso', async () => {
    const lowRoleToken = jwt.sign({ user_id: 1, ruolo_id: 1 }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${lowRoleToken}`);
    expect(res.status).to.equal(403);
    expect(res.body.message).to.equal('Accesso non autorizzato');
  });

  it('deve permettere l’accesso con ruolo sufficiente', async () => {
    const validToken = jwt.sign({ user_id: 42, ruolo_id: 3 }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).to.equal(200);
    expect(res.body.message).to.equal('Accesso consentito');
    expect(res.body.user).to.be.an('object');
    expect(res.body.user.user_id).to.equal(42);
  });

});