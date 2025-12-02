import express from 'express';
const app = express();

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { sequelize } from './config/database.js';
import './seed.js';
import { loginUser } from './controllers/AuthController.js';
import { registerUser } from './controllers/UserController.js';
import { verifyToken } from './controllers/TokenController.js';

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
  res.sendFile('public/register.html', { root: '.' });
});

app.get('/dashboard', (req, res) => {
  res.sendFile('public/dashbadmin.html', { root: '.' });
});

app.post('/register', async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        if (!fullname || !email || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Fullname, email and password are required (send JSON body with Content-Type: application/json)'
            });
        }
        // Check if user already exists
        const [existingUsers] = await sequelize.query(
            'SELECT * FROM users WHERE email = :email',
            {
                replacements: { email }
            }
        );
        if (existingUsers.length > 0) {
            return res.status(409).json({
                error: 'User already exists',
                message: 'An account with this email already exists'
            });
        }
        // Register new user
        await registerUser(fullname, email, password, 'user', true);

        return res.status(201).json({
            message: 'User registered successfully'
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Email and password are required (send JSON body with Content-Type: application/json)'
            });
        }

        const user = await loginUser(email, password);
        const { fullname, email: userEmail, token } = user || {};

        if (user) {
            res.cookie('fullname', JSON.stringify(fullname), { httpOnly: true });
            res.cookie('email', JSON.stringify(userEmail), { httpOnly: true });
            res.cookie('token', JSON.stringify(token), { httpOnly: true });

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

app.get('/users', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        // Vérifier que l'utilisateur authentifié existe, est actif et a le rôle admin
        const [adminRows] = await sequelize.query(
            `SELECT id, role FROM users WHERE id = :userId AND role = 'admin' AND actif = true`,
            {
                replacements: { userId: decoded.userId }
            }
        );

        if (!adminRows || adminRows.length === 0) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Vous n\'avez pas les droits nécessaires pour accéder à cette ressource',
            });
        }

        const [users] = await sequelize.query(
            'SELECT id, fullname, email, role, actif FROM users'
        );
        return res.status(200).json({ users });
    }
    catch (error) {
        console.error('Error fetching users:', error);
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