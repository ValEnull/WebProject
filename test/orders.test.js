require('./setup');

const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

let clienteToken, artiLegnoToken, artiTessutiToken, adminToken;
let prodottoLegnoId, prodottoTessutiId;
let cartId;
let spedizioniIds = [];

before(async () => {
  const [{ body: c }, { body: al }, { body: at }, { body: ad }] = await Promise.all([
    request(app).post('/api/users/login')
      .send({ nome_utente: 'cliente1', password: 'cliente1' }),
    request(app).post('/api/users/login')
      .send({ nome_utente: 'artigiano_legno', password: 'pass1' }),
    request(app).post('/api/users/login')
      .send({ nome_utente: 'artigiano_tessuti', password: 'pass2' }),
    request(app).post('/api/users/login')
      .send({ nome_utente: 'admin1', password: 'admin123' })
  ]);

  clienteToken     = c.token;
  artiLegnoToken   = al.token;
  artiTessutiToken = at.token;
  adminToken       = ad.token;

  const res1 = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${artiLegnoToken}`)
    .send({
      nome_prodotto: 'Prod-Test-Legno',
      tipologia_id : 1,
      prezzo       : 30,
      descrizione  : 'Prodotto test legno',
      quant        : 10
    })
    .expect(201);
  prodottoLegnoId = res1.body.prodotto_id;

  const res2 = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${artiTessutiToken}`)
    .send({
      nome_prodotto: 'Prod-Test-Tessuti',
      tipologia_id : 2,
      prezzo       : 40,
      descrizione  : 'Prodotto test tessuti',
      quant        : 10
    })
    .expect(201);
  prodottoTessutiId = res2.body.prodotto_id;
});

describe('/api/orders (flow completo)', () => {

  it('cliente aggiunge due prodotti al carrello (artigiani diversi)', async () => {
    const r1 = await request(app)
      .post(`/api/orders/carrello/${prodottoLegnoId}`)
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ quantita: 1 })
      .expect(201);

    cartId = r1.body.ordine_id;

    await request(app)
      .post(`/api/orders/carrello/${prodottoTessutiId}`)
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ quantita: 1 })
      .expect(201);
  });

  it('GET /carrello restituisce i due prodotti', async () => {
    const r = await request(app)
      .get('/api/orders/carrello')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(200);

    expect(r.body.prodotti).to.be.an('array').with.lengthOf(2);
  });

  it('cliente fa checkout: ordini split per artigiano', async () => {
    const r = await request(app)
      .patch(`/api/orders/${cartId}`)
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        stato: 'in spedizione',
        indirizzo_di_consegna: 'Via Test 123'
      })
      .expect(200);

    expect(r.body).to.have.property('ordini_generati').that.is.an('array').with.lengthOf(2);
    spedizioniIds = r.body.ordini_generati;
  });

  it('GET /storico mostra gli ordini spediti del cliente', async () => {
    const r = await request(app)
      .get('/api/orders/storico')
      .set('Authorization', `Bearer ${clienteToken}`)
      .expect(200);

    expect(r.body.some(o => spedizioniIds.includes(o.ordine_id))).to.be.true;
  });

  it('artigiano vede i propri ordini (artigiano_legno)', async () => {
    const r = await request(app)
      .get('/api/orders/venditore')
      .set('Authorization', `Bearer ${artiLegnoToken}`)
      .expect(200);

    expect(r.body.some(o => spedizioniIds.includes(o.ordine_id))).to.be.true;
  });

  it('admin elimina uno degli ordini generati', async () => {
    const toDelete = spedizioniIds[0];
    await request(app)
      .delete(`/api/orders/${toDelete}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app)
      .get(`/api/orders/${toDelete}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

});