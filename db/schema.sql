-- crea tabella ruoli
CREATE TABLE IF NOT EXISTS ruoli (
    ruolo_id SERIAL PRIMARY KEY,
    nome_ruolo VARCHAR(50) NOT NULL UNIQUE
);

-- Inserimento dei ruoli iniziali
INSERT INTO ruoli (nome_ruolo) VALUES
('cliente'),
('artigiano'),
('admin')
ON CONFLICT (nome_ruolo) DO NOTHING;

-- crea tabella tipologie
CREATE TABLE IF NOT EXISTS tipologia (
    tipologia_id SERIAL PRIMARY KEY,
    nome_tipologia VARCHAR(50) NOT NULL UNIQUE
);

--Inserimento delle tipologie 
INSERT INTO tipologia (nome_tipologia) VALUES
('Ceramica'),
('Legno'),
('Tessuti'),
('Gioielli'),
('Vetro'),
('Arredamento'),
('Elettronica'),
('Metallo'),
('Decorazioni'),
('Vario')
ON CONFLICT (nome_tipologia) DO NOTHING;

-- crea tabella utenti
CREATE TABLE IF NOT EXISTS utenti (
    id SERIAL PRIMARY KEY,
    nome_utente VARCHAR(50) NOT NULL UNIQUE,
    nome VARCHAR(50) NOT NULL,
    cognome VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    ruolo_id INTEGER NOT NULL,
    CONSTRAINT utente_ruolo_id_fkey FOREIGN KEY (ruolo_id)
        REFERENCES ruoli (ruolo_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- crea tabella artigiani
CREATE TABLE IF NOT EXISTS artigiani (
    artigiano_id INTEGER PRIMARY KEY,
    p_iva VARCHAR(11) NOT NULL,
    CAP NUMERIC(5) NOT NULL,
    CONSTRAINT artigiani_artigiano_id_fkey FOREIGN KEY (artigiano_id)
        REFERENCES utenti (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- crea tabella prodotti
CREATE TABLE IF NOT EXISTS prodotti (
    prodotto_id SERIAL PRIMARY KEY,
    artigiano_id INTEGER NOT NULL,
    nome_prodotto VARCHAR(100) NOT NULL,
    tipologia_id INTEGER,
    prezzo NUMERIC(10,2) NOT NULL,
    descrizione VARCHAR(500),
    quant INTEGER,
    CONSTRAINT prodotti_artigiano_id_fkey FOREIGN KEY (artigiano_id)
        REFERENCES artigiani (artigiano_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT prodotti_tipologia_id_fkey FOREIGN KEY (tipologia_id)
        REFERENCES tipologia (tipologia_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- crea tabella ordini
CREATE TABLE IF NOT EXISTS ordini (
    ordine_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    data_ordine TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stato VARCHAR(20) NOT NULL,
    CONSTRAINT ordini_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES utenti (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT ordini_stato_check CHECK (stato IN ('non pagato', 'in spedizione', 'in controversia', 'concluso'))
);

-- crea tabella dettagli_ordine
CREATE TABLE IF NOT EXISTS dettagli_ordine (
    ordine_id INTEGER NOT NULL,
    prodotto_id INTEGER NOT NULL,
    quantita INTEGER NOT NULL CHECK (quantita > 0),
    prezzo_unitario NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (ordine_id, prodotto_id),
    CONSTRAINT dettagli_ordine_ordine_id_fkey FOREIGN KEY (ordine_id)
        REFERENCES ordini (ordine_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT dettagli_ordine_prodotto_id_fkey FOREIGN KEY (prodotto_id)
        REFERENCES prodotti (prodotto_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- crea tabella recensioni
CREATE TABLE IF NOT EXISTS recensioni (
    recensione_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    artigiano_id INTEGER NOT NULL,
    data_recensione TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valutazione INTEGER NOT NULL CHECK (valutazione >= 1 AND valutazione <= 5),
    descrizione VARCHAR(255),
    CONSTRAINT recensioni_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES utenti (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT recensioni_artigiano_id_fkey FOREIGN KEY (artigiano_id)
        REFERENCES artigiani (artigiano_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- crea tabella segnalazioni
CREATE TABLE IF NOT EXISTS segnalazioni (
    segnalazione_id SERIAL PRIMARY KEY,
    ordine_id INTEGER NOT NULL, 
    cliente_id INTEGER NOT NULL,
    testo TEXT,
    motivazione TEXT NOT NULL, 
    data_segnalazione TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stato_segnalazione VARCHAR(20) NOT NULL DEFAULT 'in attesa',
    CONSTRAINT segnalazioni_ordine_id_fkey FOREIGN KEY (ordine_id)
        REFERENCES ordini (ordine_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT segnalazioni_cliente_id_fkey FOREIGN KEY (cliente_id)
        REFERENCES utenti (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT segnalazioni_stato_segnalazione_check CHECK (stato_segnalazione IN ('in attesa', 'risolta'))  
);

--crea tabella immagini
CREATE TABLE IF NOT EXISTS immagini (
    immagine_id SERIAL PRIMARY KEY,
    prodotto_id INTEGER NOT NULL,
    immagine_link TEXT NOT NULL,
    CONSTRAINT immagini_prodotto_id_fkey FOREIGN KEY (prodotto_id)
        REFERENCES prodotti (prodotto_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);