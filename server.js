require('dotenv').config();
const pool = require('./db/db');
const path = require('path');

const express = require('express');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rotte user
const utentiRouter = require('./routes/users');
app.use('/api/users', utentiRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});