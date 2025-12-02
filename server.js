import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { Sequelize } from '@sequelize/core';
import { MySqlDialect } from '@sequelize/mysql';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'public')));


const sequelize = new Sequelize({
  dialect: MySqlDialect,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306', 10)
});

sequelize.authenticate()
  .then(() => console.log('Connection established successfully.'))
  .catch(err => console.error('Unable to connect:', err));

function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

function authenticateBearer(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Token manquant' });
  }
  const token = auth.slice(7);
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token invalide ou expiré' });
  }
}

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ message: 'Tous les champs sont requis' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = 1;
    const token = signToken({ id: userId, email });

    return res.json({ ok: true, token });
  } catch (err) {
    console.error(err);
    return res.json({ message: 'Erreur serveur' });
  }
});


app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ message: 'Email et mot de passe requis' });
  }

  try {
    const token = signToken({ id: 1, email });
    return res.json({ ok: true, token });
  } catch (err) {
    console.error(err);
    return res.json({ message: 'Erreur serveur' });
  }
});

app.get('/api/profile', authenticateBearer, (req, res) => {
  res.json({ ok: true, user: req.user });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});