import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { sequelize } from './config/database.js';
import './seed.js';

// Import middlewares
import { loggerMiddleware } from './middleware/logger.js';
import { trackOnlineUsers } from './middleware/onlineUsers.js';
import { checkAccountActive } from './middleware/accountCheck.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import pagesRoutes from './routes/pages.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// Middleware de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuration des sessions en mémoire
app.use(session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Mettre à true en production avec HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));

// Middlewares personnalisés
app.use(loggerMiddleware);
app.use(trackOnlineUsers);
app.use(checkAccountActive);

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

// Fichiers statiques
app.use(express.static('public'));

// Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', pagesRoutes);
app.use('/quizz', quizRoutes);
app.use('/', userRoutes);
app.use('/', adminRoutes);

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

// Démarrage du serveur
app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on http://0.0.0.0:3000');
});
