require('./setup');                      // importa reset/seed globale

const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

let artiToken, adminToken, productId;

before(async () => {
  // Login utenti esistenti creati dal seed
  const resArti  = await request(app)
    .post('/api/users/login')
    .send({ nome_utente: 'artigiano_legno', password: 'pass1' });
  artiToken = resArti.body.token;

  const resAdmin = await request(app)
    .post('/api/users/login')
    .send({ nome_utente: 'admin1', password: 'admin123' });
  adminToken = resAdmin.body.token;
});

describe('/api/products', () => {

  it('artigiano crea un prodotto', async () => {
    const r = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${artiToken}`)
      .send({
        nome_prodotto: 'TestProd',
        tipologia_id : 1,
        prezzo       : 9.99,
        descrizione  : 'descr',
        quant        : 5
      })
      .expect(201);
    productId = r.body.prodotto_id;
  });

  it('lista prodotti → r.body.prodotti è array', async () => {
    const r = await request(app).get('/api/products').expect(200);
    expect(r.body.prodotti).to.be.an('array').that.is.not.empty;
  });

  it('GET singolo prodotto restituisce 200', async () => {
    const r = await request(app)
      .get(`/api/products/${productId}`)
      .expect(200);
    expect(r.body.prodotto_id).to.equal(productId);
  });

  it('artigiano modifica il proprio prodotto', async () => {
    const r = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${artiToken}`)
      .send({ prezzo: 14.99 })
      .expect(200);
    expect(r.body.prodotto.prezzo).to.equal('14.99');
  });

  it('admin elimina il prodotto', async () => {
    await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('GET dopo DELETE → 404', () =>
    request(app).get(`/api/products/${productId}`).expect(404));

    it('cliente/admin NON può creare prodotto (400/403/500)', () =>
    request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome_prodotto: 'Bad', prezzo: 1, quant: 1 })
        .expect(500));
});