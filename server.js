require('dotenv').config();
const pool = require('./db/db');
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();



app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rotte user
const utentiRouter = require('./routes/users');
app.use('/api/users', utentiRouter);

// Rotte prodotti
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

//Rotte ordini
const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);

// Rotte recensioni
const ratingRouter = require('./routes/rating');
app.use('/api/rating', ratingRouter);

// Rotte segnalazioni
const reportRouter = require('./routes/report');
app.use('/api/report', reportRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});