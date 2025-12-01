import express from 'express';
const app = express();

import { sequelize } from './config/database.js';
import { syncDatabase } from './seed.js';

// connect to the database
sequelize.authenticate()
  .then(() => {
    console.log('Connection established successfully.');
  })
  .catch(err => console.error('Unable to connect:', err));

sequelize.sync()
  .then(() => {
    console.log('Database synchronized.');
  })
  .catch(err => console.error('Error synchronizing database:', err));

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});




app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/login', (req, res) => {
  res.send('Login Page');
});

app.get('/register', (req, res) => {
  res.send('Register Page');
});

app.get('/dashboard', (req, res) => {
  res.send('Dashboard Page');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (email === '' || password === '') {
        return res.status(400).send('Email and password are required');
    }

    // Authentication logic here
    try {
        const user = await loginUser(email, password);
        if (user) {
            res.status(200).send('Login successful');
        } else {
            res.status(401).send('Invalid email or password');
        }
    } catch (error) {
        res.status(500).send('Internal server error');
    }
});

export { app, sequelize };