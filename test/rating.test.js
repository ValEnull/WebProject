require('./setup');  

const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

let cliente1Tok, cliente2Tok, adminTok, artiTok;
let prodottoId;
let rec1Id, rec2Id;

before(async () => {
  // login utenti di seed.js
  const [{ body: c1 }, { body: c2 }, { body: ad }, { body: ar }] = await Promise.all([
    request(app).post('/api/users/login')
      .send({ nome_utente: 'cliente1', password: 'cliente1' }),
    request(app).post('/api/users/login')
      .send({ nome_utente: 'cliente2', password: 'cliente2' }),
    request(app).post('/api/users/login')
      .send({ nome_utente: 'admin1',   password: 'admin123' }),
    request(app).post('/api/users/login')
      .send({ nome_utente: 'artigiano_legno', password: 'pass1' })
  ]);

  cliente1Tok = c1.token;
  cliente2Tok = c2.token;
  adminTok    = ad.token;
  artiTok     = ar.token;

  // artigiano crea un prodotto “recensioni-test”
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${artiTok}`)
    .send({
      nome_prodotto: 'Recensioni-Test',
      tipologia_id : 1,
      prezzo       : 10,
      descrizione  : 'prova',
      quant        : 5
    })
    .expect(201);

  prodottoId = res.body.prodotto_id;
});

describe('/api/rating (recensioni)', () => {

  it('cliente1 crea una recensione (5★)', async () => {
    const r = await request(app)
      .post(`/api/rating/${prodottoId}`)
      .set('Authorization', `Bearer ${cliente1Tok}`)
      .send({ valutazione: 5, descrizione: 'perfetto' })
      .expect(201);

    rec1Id = r.body.recensione.recensione_id;
  });

  it('cliente1 non può recensire due volte ➜ 409', () =>
    request(app)
      .post(`/api/rating/${prodottoId}`)
      .set('Authorization', `Bearer ${cliente1Tok}`)
      .send({ valutazione: 4 })
      .expect(409));

  it('cliente2 crea seconda recensione (4★)', async () => {
    const r = await request(app)
      .post(`/api/rating/${prodottoId}`)
      .set('Authorization', `Bearer ${cliente2Tok}`)
      .send({ valutazione: 4, descrizione: 'buono' })
      .expect(201);

    rec2Id = r.body.recensione.recensione_id;
  });

  it('GET /average restituisce media 4.50 e 2 recensioni', async () => {
    const r = await request(app)
      .get(`/api/rating/${prodottoId}/average`)
      .expect(200);

    expect(r.body.media_voto).to.equal('4.50');
    expect(+r.body.numero_recensioni).to.equal(2);
  });

  it('GET elenco recensioni restituisce le 2 recensioni', async () => {
    const r = await request(app)
      .get(`/api/rating/${prodottoId}`)
      .expect(200);

    expect(r.body).to.be.an('array').with.lengthOf(2);
  });

  it('cliente1 modifica la propria recensione (3★)', async () => {
    await request(app)
      .patch(`/api/rating/${rec1Id}`)
      .set('Authorization', `Bearer ${cliente1Tok}`)
      .send({ valutazione: 3, descrizione: 'okay' })
      .expect(200);

    const r = await request(app)
      .get(`/api/rating/${prodottoId}/average`)
      .expect(200);

    expect(r.body.media_voto).to.equal('3.50');  
  });

  it('cliente2 NON può modificare la recensione di cliente1 ➜ 403', () =>
    request(app)
      .patch(`/api/rating/${rec1Id}`)
      .set('Authorization', `Bearer ${cliente2Tok}`)
      .send({ valutazione: 2 })
      .expect(403));

  it('admin elimina la recensione di cliente2', async () => {
    await request(app)
      .delete(`/api/rating/${rec2Id}`)
      .set('Authorization', `Bearer ${adminTok}`)
      .expect(200);

    const r = await request(app)
      .get(`/api/rating/${prodottoId}/average`)
      .expect(200);

    expect(r.body.media_voto).to.equal('3.00');   
    expect(+r.body.numero_recensioni).to.equal(1);
  });

});