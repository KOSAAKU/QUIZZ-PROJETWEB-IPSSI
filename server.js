import express from 'express';
const app = express();

import { Sequelize } from '@sequelize/core';
import { MySqlDialect } from '@sequelize/mysql';

import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize({
  dialect: MySqlDialect,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
});

sequelize.authenticate()
  .then(() => console.log('Connection established successfully.'))
  .catch(err => console.error('Unable to connect:', err));

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});