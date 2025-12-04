import express from 'express';
import { loginUser } from '../controllers/AuthController.js';
import { registerUser } from '../controllers/UserController.js';
import { verifyToken } from '../controllers/TokenController.js';
import { sequelize } from '../config/database.js';
import { onlineUsers } from '../middleware/onlineUsers.js';

const router = express.Router();

// GET routes
router.get('/', async (req, res) => {
    res.sendFile('public/index.html', { root: '.' });
});

router.get('/login', async (req, res) => {
    res.sendFile('public/login.html', { root: '.' });
});

router.get('/register', async (req, res) => {
    res.sendFile('public/register.html', { root: '.' });
});

router.get('/logout', async (req, res) => {
    // Retirer l'utilisateur de la liste des connectés
    const tokenCookie = req.cookies.token;
    if (tokenCookie) {
        try {
            const token = JSON.parse(tokenCookie);
            const decoded = await verifyToken(token);
            if (decoded && decoded.userId) {
                onlineUsers.delete(decoded.userId);
            }
        } catch (err) {
            // Ignorer les erreurs
        }
    }

    res.clearCookie('fullname');
    res.clearCookie('email');
    res.clearCookie('token');
    res.sendFile('public/logout.html', { root: '.' });
});

// POST routes
router.post('/register', async (req, res) => {
    try {
        const { fullname, email, password, role } = req.body;

        if (!fullname || !email || !password || !role) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Fullname, email, password, and role are required (send JSON body with Content-Type: application/json)'
            });
        }

        if (role !== 'user' && role !== 'ecole' && role !== 'entreprise') {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Role must be one of: user, ecole, entreprise'
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
        await registerUser(fullname, email, password, role, true);

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

router.post('/login', async (req, res) => {
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

export default router;
