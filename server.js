import express from 'express';
const app = express();

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { sequelize } from './config/database.js';
import { loginUser } from './controllers/AuthController.js';

// Fonction async pour initialiser la base de données
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    await sequelize.sync();
    console.log('Database synchronized.');
  } catch (err) {
    console.error('Database error:', err);
    process.exit(1);
  }
}

// Initialiser la base de données
await initDatabase();

app.use(express.static('public'));



app.get('/login', (req, res) => {
    res.sendFile('public/login.html', { root: '.' });
});

app.get('/register', (req, res) => {
  res.send('Register Page');
});

app.get('/dashboard', (req, res) => {
  res.send('Dashboard Page');
});

app.post('/login', async (req, res) => {
    try {
        console.log('Login request body:', req.body);
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Email and password are required (send JSON body with Content-Type: application/json)'
            });
        }

        const user = await loginUser(email, password);

        if (user) {
            return res.status(200).json({
                message: 'Login successful',
                user: user
            });
        } else {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on http://0.0.0.0:3000');
});