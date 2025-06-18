const bcrypt = require('bcrypt');
const pool = require('./db');
const fs = require('fs').promises;

async function inserisciImmagineDaFile(prodotto_id, pathFile) {
  try {
    // Leggi il file immagine come buffer
    const imgBuffer = await fs.readFile(pathFile);

    // Inserisci nel db (query parametrizzata)
    const insertQuery = `
      INSERT INTO immagini (prodotto_id, immagine)
      VALUES ($1, $2)
      RETURNING immagine_id
    `;

    const result = await pool.query(insertQuery, [prodotto_id, imgBuffer]);

  } catch (err) {
    console.error(`Errore inserimento immagine per prodotto ${prodotto_id}:`, err);
  }
}

async function seed() {
    console.log('Esecuzione seed...');

    try {
        // Verifica se esistono utenti
        const check = await pool.query("SELECT COUNT(*) FROM utenti");
        if (parseInt(check.rows[0].count) > 0) {
            console.log('Dati già presenti. Seed annullato.');
            return;
        }

        const saltRounds = 10;

        // --- CREA UTENTI ---
        const utenti = [
            // Artigiani
            { nome_utente: 'artigiano_legno', nome: 'Luca', cognome: 'Rami', email: 'luca@legno.it', ruolo: 'artigiano', password: 'pass1' },
            { nome_utente: 'artigiano_tessuti', nome: 'Maria', cognome: 'Seta', email: 'maria@tessuti.it', ruolo: 'artigiano', password: 'pass2' },
            { nome_utente: 'artigiano_gioielli', nome: 'Giulia', cognome: 'Oro', email: 'giulia@gioielli.it', ruolo: 'artigiano', password: 'pass3' },
            { nome_utente: 'artigiano_vetro', nome: 'Antonio', cognome: 'Cristallo', email: 'antonio@vetro.it', ruolo: 'artigiano', password: 'pass4' },
            { nome_utente: 'artigiano_metallo', nome: 'Francesca', cognome: 'Ferro', email: 'francesca@metallo.it', ruolo: 'artigiano', password: 'pass5' },
            // Clienti
            { nome_utente: 'cliente1', nome: 'Elena', cognome: 'Rossi', email: 'elena@clienti.it', ruolo: 'cliente', password: 'cliente1' },
            { nome_utente: 'cliente2', nome: 'Davide', cognome: 'Bianchi', email: 'davide@clienti.it', ruolo: 'cliente', password: 'cliente2' }
        ];

        // Recupera ruoli
        const ruoliRes = await pool.query("SELECT ruolo_id, nome_ruolo FROM ruoli");
        const ruoliMap = Object.fromEntries(ruoliRes.rows.map(r => [r.nome_ruolo, r.ruolo_id]));

        const utentiMap = {};

        for (const u of utenti) {
            const hash = await bcrypt.hash(u.password, saltRounds);
            const res = await pool.query(
                `INSERT INTO utenti (nome_utente, nome, cognome, email, password_hash, ruolo_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id`,
                [u.nome_utente, u.nome, u.cognome, u.email, hash, ruoliMap[u.ruolo]]
            );
            utentiMap[u.nome_utente] = res.rows[0].id;
        }

        // --- CREA ARTIGIANI ---
        const tipologie = {
            'artigiano_legno': 'Legno',
            'artigiano_tessuti': 'Tessuti',
            'artigiano_gioielli': 'Gioielli',
            'artigiano_vetro': 'Vetro',
            'artigiano_metallo': 'Metallo'
        };

        const tipologiaRes = await pool.query("SELECT tipologia_id, nome_tipologia FROM tipologia");
        const tipologiaMap = Object.fromEntries(tipologiaRes.rows.map(t => [t.nome_tipologia, t.tipologia_id]));

        for (const [nome_utente, tipologia] of Object.entries(tipologie)) {
            await pool.query(
                `INSERT INTO artigiani (artigiano_id, p_iva, CAP)
                 VALUES ($1, $2, $3)`,
                [utentiMap[nome_utente], '12345678901', 50100]
            );
        }

        // --- CREA PRODOTTI ---
        const prodottiArtigiani = {
            artigiano_legno: [
                { nome: 'Tagliere in legno d’ulivo', descrizione: 'Tagliere artigianale in legno massello', prezzo: 25.00 },
                { nome: 'Tavolino rustico', descrizione: 'Tavolino da salotto in legno riciclato', prezzo: 120.00 },
                { nome: 'Cornice intagliata a mano', descrizione: 'Cornice decorativa lavorata a mano', prezzo: 45.00 },
            ],
            artigiano_tessuti: [
                { nome: 'Sciarpa in lana merino', descrizione: 'Sciarpa fatta a mano con lana naturale', prezzo: 35.00 },
                { nome: 'Cuscino ricamato', descrizione: 'Cuscino in lino con ricami floreali', prezzo: 28.00 },
                { nome: 'Tenda in cotone grezzo', descrizione: 'Tenda leggera realizzata su misura', prezzo: 60.00 },
            ],
            artigiano_gioielli: [
                { nome: 'Orecchini in argento', descrizione: 'Orecchini fatti a mano con pietre naturali', prezzo: 40.00 },
                { nome: 'Bracciale in rame battuto', descrizione: 'Bracciale unico in rame ossidato', prezzo: 35.00 },
                { nome: 'Anello in filigrana', descrizione: 'Anello artigianale con decorazioni sottili', prezzo: 50.00 },
            ],
            artigiano_vetro: [
                { nome: 'Lampada in vetro soffiato', descrizione: 'Lampada artistica in vetro colorato', prezzo: 95.00 },
                { nome: 'Bicchieri decorati', descrizione: 'Set di 4 bicchieri con decorazioni a smalto', prezzo: 30.00 },
                { nome: 'Specchio con cornice in vetro', descrizione: 'Specchio con dettagli in vetro colorato', prezzo: 70.00 },
            ],
            artigiano_metallo: [
                { nome: 'Portacandele in ferro battuto', descrizione: 'Design rustico e fatto a mano', prezzo: 22.00 },
                { nome: 'Scultura astratta in metallo', descrizione: 'Pezzo d’arte moderna per interni', prezzo: 150.00 },
                { nome: 'Maniglia per porta stile vintage', descrizione: 'Maniglia artigianale in ottone', prezzo: 18.00 },
            ]
        };

        const prodottiInseriti = [];

        for (const [nome_utente, prodotti] of Object.entries(prodottiArtigiani)) {
            const artigianoId = utentiMap[nome_utente];
            const tipologiaId = tipologiaMap[tipologie[nome_utente]];

            for (const p of prodotti) {
                const res = await pool.query(
                    `INSERT INTO prodotti (artigiano_id, nome_prodotto, tipologia_id, prezzo, descrizione, quant)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING prodotto_id`,
                    [artigianoId, p.nome, tipologiaId, p.prezzo, p.descrizione, 10]
                );
                prodottiInseriti.push({ prodotto_id: res.rows[0].prodotto_id, artigiano_id: artigianoId });
            }
        }

        // --- INSERISCI IMMAGINI ---

        await inserisciImmagineDaFile(prodottiInseriti[0].prodotto_id, './img/seedImages/tagliere_ulivo.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[1].prodotto_id, './img/seedImages/tavolino_rustico.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[2].prodotto_id, './img/seedImages/cornice_intagliata.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[3].prodotto_id, './img/seedImages/sciarpa_lana.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[4].prodotto_id, './img/seedImages/cuscino_ricamato.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[5].prodotto_id, './img/seedImages/tenda_cotone.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[6].prodotto_id, './img/seedImages/orecchini_argento.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[7].prodotto_id, './img/seedImages/bracciale_rame.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[8].prodotto_id, './img/seedImages/anello_in_filigrana.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[9].prodotto_id, './img/seedImages/lampada_vetro_soffiato.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[10].prodotto_id, './img/seedImages/bicchieri_decorati.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[11].prodotto_id, './img/seedImages/specchio_vetro.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[12].prodotto_id, './img/seedImages/portacandele_ferro.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[13].prodotto_id, './img/seedImages/scultura_metallo.jpg');
        await inserisciImmagineDaFile(prodottiInseriti[14].prodotto_id, './img/seedImages/maniglia_vintage.jpg');



        // --- CREA RECENSIONI ---
        const clienti = [utentiMap['cliente1'], utentiMap['cliente2']];
        let index = 0;

        for (const p of prodottiInseriti) {
            const clienteId = clienti[index % clienti.length];
            await pool.query(
                `INSERT INTO recensioni (cliente_id, prodotto_id, valutazione, descrizione)
                VALUES ($1, $2, $3, $4)`,
                [clienteId, p.prodotto_id, 5, 'Ottimo prodotto!']
            );
            index++;
        }


        console.log('Seed completato con successo.');

    } catch (err) {
        console.error('Errore durante il seed:', err);
    }
}

seed();