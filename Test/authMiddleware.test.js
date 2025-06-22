import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import authMiddleware from '../../middleware/auth'; // correggi se il path è diverso
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const app = express();

// Middleware di test che include authMiddleware
app.get('/protected', authMiddleware(2), (req, res) => {
  res.json({ message: 'Accesso consentito', user: req.user });
});

describe('authMiddleware()', () => {

  it('dovrebbe restituire 401 se manca il token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).to.equal(401);
    expect(res.body.message).to.equal('Token mancante o non valido');
  });

  it('dovrebbe restituire 403 se il token è malformato', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer tokenNonValido');
    expect(res.status).to.equal(403);
    expect(res.body.message).to.equal('Token non valido o scaduto');
  });

  it('dovrebbe restituire 403 se il ruolo è troppo basso', async () => {
    const lowRoleToken = jwt.sign({ user_id: 1, ruolo_id: 1 }, JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${lowRoleToken}`);
    expect(res.status).to.equal(403);
    expect(res.body.message).to.equal('Accesso non autorizzato');
  });

  it('dovrebbe permettere l’accesso con ruolo sufficiente', async () => {
    const validToken = jwt.sign({ user_id: 42, ruolo_id: 3 }, JWT_SECRET);
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).to.equal(200);
    expect(res.body.message).to.equal('Accesso consentito');
    expect(res.body.user).to.be.an('object');
    expect(res.body.user.user_id).to.equal(42);
  });

});
