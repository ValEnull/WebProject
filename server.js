require('dotenv').config();
const pool = require('./db/db');
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();


// Allow requests from your actual frontend origin (127.0.0.1:5501)
app.use(cors({
  origin: 'http://127.0.0.1:5501',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rotte user
const utentiRouter = require('./routes/users');
app.use('/api/users', utentiRouter);

// Rotte prodotti
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});