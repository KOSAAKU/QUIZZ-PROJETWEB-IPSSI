import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const app = express();

// Middleware pour parser le JSON
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

// Store pour tracker les utilisateurs connectés en mémoire
const onlineUsers = new Map(); // userId -> { fullname, email, role, lastActivity, sessionId }

import { logger } from './controllers/LoggerController.js';
import { sequelize } from './config/database.js';
import './seed.js';
import { loginUser } from './controllers/AuthController.js';
import { getUserById, registerUser } from './controllers/UserController.js';
import { verifyToken } from './controllers/TokenController.js';

app.use((req, res, next) => {
    console.log('Request received:');
    logger(req, res);
    next();
});

// Middleware pour mettre à jour l'activité des utilisateurs connectés
app.use(async (req, res, next) => {
    const tokenCookie = req.cookies.token;

    if (tokenCookie) {
        try {
            const token = JSON.parse(tokenCookie);
            const decoded = await verifyToken(token);

            if (decoded && decoded.userId) {
                const user = await getUserById(decoded.userId);

                if (user && user.actif) {
                    // Mettre à jour ou ajouter l'utilisateur dans la liste des connectés
                    onlineUsers.set(decoded.userId, {
                        userId: decoded.userId,
                        fullname: user.fullname,
                        email: user.email,
                        role: user.role,
                        lastActivity: new Date(),
                        sessionId: req.sessionID
                    });

                    // Nettoyer les sessions inactives (plus de 10 minutes)
                    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
                    for (const [userId, userData] of onlineUsers.entries()) {
                        if (userData.lastActivity < tenMinutesAgo) {
                            onlineUsers.delete(userId);
                        }
                    }
                }
            }
        } catch (err) {
            // Ignorer les erreurs de token
        }
    }

    next();
});

import { createQuizz } from './controllers/QuizzController.js';
import { generateQuizWithGemini } from './controllers/GeminiController.js';

app.use((req, res, next) => {
    // Check if the user account is active before proceeding
    const tokenCookie = req.cookies.token;
    if (tokenCookie) {
        try {
            const token = JSON.parse(tokenCookie);
            verifyToken(token).then(async (decoded) => {
                if (decoded && decoded.userId) {
                    const user = await getUserById(decoded.userId);
                    if (user && !user.actif) {
                        return res.sendFile('public/ban.html', { root: '.' });
                    }
                }
            }).catch(() => {
                console.log('Error verifying token in account active check.');
                res.status(400).send('Invalid token.');
            });
        } catch (err) {
            console.error('Error parsing token cookie:', err);
            res.status(400).send('Invalid token format.');
            return;
        }
    }
    next();
});

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

app.get('/login', async (req, res) => {
    res.sendFile('public/login.html', { root: '.' });
});

app.get('/register', async (req, res) => {
  res.sendFile('public/register.html', { root: '.' });
});

app.get('/dashboard', async (req, res) => {
    const cookies = req.cookies;
    
    if (!cookies.token) {
        return res.redirect('/login');
    }

    const token = JSON.parse(cookies.token);

    const decoded = await verifyToken(token);
    
    if (!decoded) {
        return res.redirect('/login');
    }

    const user = await getUserById(decoded.userId);
    
    if (!user) {
        return res.redirect('/login');
    }
    
    switch (user.role) {
        case 'admin':
            console.log('Dashboard - sending admin dashboard');
            return res.sendFile('public/dashbadmin.html', { root: '.' });
        case 'ecole':
            console.log('Dashboard - sending ecole dashboard');
            return res.sendFile('public/dashbecole.html', { root: '.' });
        case 'entreprise':
            console.log('Dashboard - sending entreprise dashboard');
            return res.sendFile('public/dashbentreprise.html', { root: '.' });
        case 'user':
            console.log('Dashboard - sending user dashboard');
            return res.sendFile('public/dashbuser.html', { root: '.' });
        default:
            console.log('Dashboard - invalid role, redirecting to login');
            return res.redirect('/login');
    }
});

app.get('/quizz/create', async (req, res) => {
    const cookies = req.cookies;
    if (!cookies.token) {
        return res.redirect('/login');
    }

    const token = JSON.parse(cookies.token);
    const decoded = await verifyToken(token);
    if (!decoded) {
        return res.redirect('/login');
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
        return res.redirect('/login');
    }

    if (user.role !== 'ecole' && user.role !== 'entreprise') {
        return res.redirect('/login');
    }

    if (user.role === 'ecole') {
        return res.sendFile('public/create_quizz_ecole.html', { root: '.' });
    } else if (user.role === 'entreprise') {
        return res.sendFile('public/create_quizz_entreprise.html', { root: '.' });
    }
});

app.get('/dashboard/quizz/:id', async (req, res) => {
    const cookies = req.cookies;
    if (!cookies.token) {
        return res.redirect('/login');
    }

    const token = JSON.parse(cookies.token);
    const decoded = await verifyToken(token);
    if (!decoded) {
        return res.redirect('/login');
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
        return res.redirect('/login');
    }

    if (user.role !== 'ecole' && user.role !== 'entreprise') {
        return res.redirect('/login');
    }

    res.sendFile('public/quiz_participants.html', { root: '.' });
});

app.get('/dashboard/quizz/:id/:answerId', async (req, res) => {
    const cookies = req.cookies;
    if (!cookies.token) {
        return res.redirect('/login');
    }

    const token = JSON.parse(cookies.token);
    const decoded = await verifyToken(token);
    if (!decoded) {
        return res.redirect('/login');
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
        return res.redirect('/login');
    }

    if (user.role !== 'ecole' && user.role !== 'entreprise') {
        return res.redirect('/login');
    }

    res.sendFile('public/quiz_answers.html', { root: '.' });
});

app.get('/logout', async (req, res) => {
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

app.post('/register', async (req, res) => {
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
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        // Parser le token (il est stocké en JSON)
        const token = JSON.parse(tokenCookie);

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

app.get('/quizzes', async (req, res) => {
    try {
        // check if the user is authenticated
        const tokenCookie = req.cookies.token;
        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        const [userRows] = await sequelize.query(
            `SELECT id, role FROM users WHERE id = :userId AND actif = true`,
            {
                replacements: { userId: decoded.userId }
            }
        );
        if (!userRows || userRows.length === 0) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Vous n\'avez pas les droits nécessaires pour accéder à cette ressource',
            });
        }

        const ownerId = userRows[0].id;

        const [quizzes] = await sequelize.query(
            `SELECT q.*, COUNT(r.id) as participants 
             FROM quizzs q 
             LEFT JOIN reponses r ON q.id = r.quizzId 
             WHERE q.ownerId = :ownerId 
             GROUP BY q.id`,
            {
            replacements: { ownerId: ownerId }
            }
        );

        let formattedQuizzes = quizzes.map((quizz) => {
            return {
                ...quizz,
                questions: Array.isArray(quizz.questions) 
                    ? quizz.questions.length 
                    : (typeof quizz.questions === 'string' 
                        ? JSON.parse(quizz.questions).length 
                        : 0)
            };
        });

        return res.status(200).json({ quizzs: formattedQuizzes });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.get('/quizz/:id/toggle', async (req, res) => {
    try {
        // check the user is authenticated
        const tokenCookie = req.cookies.token;
        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        const quizId = req.params.id;

        // get the quiz
        const [quizRows] = await sequelize.query(
            'SELECT status FROM quizzs WHERE id = :quizId AND ownerId = :ownerId LIMIT 1',
            {
                replacements: { quizId, ownerId: decoded.userId }
            }
        );

        if (!quizRows || quizRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quizz not found'
            });
        }

        const currentStatus = quizRows[0].status;
        switch (currentStatus) {
            case 'pending':
                // change to started
                await sequelize.query(
                    "UPDATE quizzs SET status = 'started' WHERE id = :quizId",
                    { replacements: { quizId }}
                );
                break;
            case 'started':
                // change to finish
                await sequelize.query(
                    "UPDATE quizzs SET status = 'finish' WHERE id = :quizId",
                    { replacements: { quizId }}
                );
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid operation',
                    message: `Cannot toggle quizz with status '${currentStatus}'`
                });
        }
        return res.status(200).json({ message: 'Quizz status updated successfully' });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.delete('/quizz/:id/delete', async (req, res) => {
    try {
        // check the user is authenticated
        const tokenCookie = req.cookies.token;
        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        const quizId = req.params.id;

        // delete the quiz
        const [result] = await sequelize.query(
            'DELETE FROM quizzs WHERE id = :quizId AND ownerId = :ownerId',
            {
                replacements: { quizId, ownerId: decoded.userId }
            }
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quizz not found or you do not have permission to delete it'
            });
        }
        return res.status(200).json({ message: 'Quizz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.get('/quizzes/:id', async (req, res) => {
    try {
        const quizzId = req.params.id;
        const [quizzRows] = await sequelize.query(
            "SELECT * FROM quizzs WHERE id = :quizzId AND status = 'started' LIMIT 1",
            {
                replacements: { quizzId }
            }
        );
        if (!quizzRows || quizzRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quizz introuvable ou non disponible'
            });
        }
        const quizz = quizzRows[0];

        // Parse questions if stored as string
        let questions = typeof quizz.questions === 'string'
            ? JSON.parse(quizz.questions)
            : quizz.questions;

        // Remove answers from QCM questions
        if (Array.isArray(questions)) {
            questions = questions.map(q => {
            if (q.type === 'qcm') {
                const { answer, ...questionWithoutAnswer } = q;
                return questionWithoutAnswer;
            }
            return q;
            });
        }

        quizz.questions = questions;
        return res.status(200).json(quizz);
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.get('/api/quizzes/:id/participants', async (req, res) => {
    try {
        const quizId = req.params.id;

        // Vérifier l'authentification
        const tokenCookie = req.cookies.token;
        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        // Vérifier que l'utilisateur est le propriétaire du quiz
        const [quizRows] = await sequelize.query(
            'SELECT name, ownerId FROM quizzs WHERE id = :quizId LIMIT 1',
            {
                replacements: { quizId }
            }
        );

        if (!quizRows || quizRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quiz introuvable'
            });
        }

        const quiz = quizRows[0];

        if (quiz.ownerId !== decoded.userId) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Vous n\'avez pas accès à ce quiz'
            });
        }

        // Récupérer les participants et leurs scores
        const [participants] = await sequelize.query(
            `SELECT
                r.id as answerId,
                r.userId,
                r.answers,
                r.createdAt as submittedAt,
                u.fullname as userName,
                u.email as userEmail
             FROM reponses r
             LEFT JOIN users u ON r.userId = u.id
             WHERE r.quizzId = :quizId
             ORDER BY r.createdAt DESC`,
            {
                replacements: { quizId }
            }
        );

        // Calculer les scores pour chaque participant
        const participantsWithScores = participants.map(p => {
            const answers = typeof p.answers === 'string' ? JSON.parse(p.answers) : p.answers;

            let score = 0;
            let total = 0;

            if (Array.isArray(answers)) {
                answers.forEach(answer => {
                    if (answer.type === 'qcm') {
                        total++;
                        if (answer.isCorrect === true) {
                            score++;
                        }
                    }
                });
            }

            return {
                answerId: p.answerId,
                userId: p.userId,
                userName: p.userId === 0 ? 'Anonyme' : p.userName,
                userEmail: p.userId === 0 ? null : p.userEmail,
                score: score,
                total: total,
                submittedAt: p.submittedAt
            };
        });

        return res.status(200).json({
            quizName: quiz.name,
            participants: participantsWithScores
        });
    } catch (error) {
        console.error('Error fetching participants:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.get('/api/quizzes/:id/answers/:answerId', async (req, res) => {
    try {
        const { id: quizId, answerId } = req.params;

        // Vérifier l'authentification
        const tokenCookie = req.cookies.token;
        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        // Vérifier que l'utilisateur est le propriétaire du quiz
        const [quizRows] = await sequelize.query(
            'SELECT name, ownerId FROM quizzs WHERE id = :quizId LIMIT 1',
            {
                replacements: { quizId }
            }
        );

        if (!quizRows || quizRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quiz introuvable'
            });
        }

        const quiz = quizRows[0];

        if (quiz.ownerId !== decoded.userId) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Vous n\'avez pas accès à ce quiz'
            });
        }

        // Récupérer les réponses du participant
        const [answerRows] = await sequelize.query(
            `SELECT
                r.userId,
                r.answers,
                r.createdAt as submittedAt,
                u.fullname as userName,
                u.email as userEmail
             FROM reponses r
             LEFT JOIN users u ON r.userId = u.id
             WHERE r.id = :answerId AND r.quizzId = :quizId
             LIMIT 1`,
            {
                replacements: { answerId, quizId }
            }
        );

        if (!answerRows || answerRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Réponses introuvables'
            });
        }

        const answerData = answerRows[0];
        const answers = typeof answerData.answers === 'string'
            ? JSON.parse(answerData.answers)
            : answerData.answers;

        // Calculer le score
        let score = 0;
        let total = 0;

        if (Array.isArray(answers)) {
            answers.forEach(answer => {
                if (answer.type === 'qcm') {
                    total++;
                    if (answer.isCorrect === true) {
                        score++;
                    }
                }
            });
        }

        return res.status(200).json({
            quizName: quiz.name,
            userName: answerData.userId === 0 ? 'Anonyme' : answerData.userName,
            userEmail: answerData.userId === 0 ? null : answerData.userEmail,
            score: score,
            total: total,
            submittedAt: answerData.submittedAt,
            answers: answers
        });
    } catch (error) {
        console.error('Error fetching answers:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/quizzes/:id/submit', async (req, res) => {
    try {
        const quizId = req.params.id;
        const { answers } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Les réponses sont requises et doivent être un tableau'
            });
        }

        // Vérifier l'authentification de l'utilisateur
        const tokenCookie = req.cookies.token;
        let userId = null;

        if (tokenCookie) {
            try {
                const token = JSON.parse(tokenCookie);
                const decoded = await verifyToken(token);
                if (decoded) {
                    userId = decoded.userId;
                }
            } catch (err) {
                // Si le token est invalide, on continue sans userId (utilisateur anonyme)
                console.log('Invalid token, continuing as anonymous');
            }
        }

        // Récupérer le quizz avec les bonnes réponses
        const [quizRows] = await sequelize.query(
            "SELECT * FROM quizzs WHERE id = :quizId AND status = 'started' LIMIT 1",
            {
                replacements: { quizId }
            }
        );

        if (!quizRows || quizRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quizz introuvable ou non disponible'
            });
        }

        const quizz = quizRows[0];
        // Parse questions if stored as string
        let questions = typeof quizz.questions === 'string'
            ? JSON.parse(quizz.questions)
            : quizz.questions;

        // Vérifier que le nombre de réponses correspond au nombre de questions
        if (answers.length !== questions.length) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Le nombre de réponses ne correspond pas au nombre de questions'
            });
        }

        // Calculer le score
        let score = 0;
        const results = [];

        answers.forEach((userAnswer, index) => {
            const question = questions[index];
            let isCorrect = false;

            if (question.type === 'qcm') {
                // Comparer la réponse de l'utilisateur avec la bonne réponse
                isCorrect = userAnswer.answer === question.answer;
                if (isCorrect) {
                    score++;
                }
            } else if (question.type === 'libre') {
                // Pour les questions libres, on ne peut pas auto-corriger
                // On considère la réponse comme "à corriger manuellement"
                isCorrect = null; // null signifie "nécessite correction manuelle"
            }

            results.push({
                questionIndex: index,
                question: question.question,
                type: question.type,
                userAnswer: userAnswer.answer,
                correctAnswer: question.answer || null,
                isCorrect: isCorrect
            });
        });

        // Calculer le nombre total de questions QCM (celles qui sont auto-corrigées)
        const totalQCM = questions.filter(q => q.type === 'qcm').length;

        // Enregistrer les réponses dans la table reponses
        const answersJson = JSON.stringify(results);

        if (userId) {
            // Si l'utilisateur est authentifié, enregistrer avec son userId
            await sequelize.query(
                'INSERT INTO reponses (quizzId, userId, answers, createdAt) VALUES (:quizzId, :userId, :answers, NOW())',
                {
                    replacements: {
                        quizzId: quizId,
                        userId: userId,
                        answers: answersJson
                    }
                }
            );
        } else {
            // Si l'utilisateur n'est pas authentifié, enregistrer avec userId = NULL ou 0
            await sequelize.query(
                'INSERT INTO reponses (quizzId, userId, answers, createdAt) VALUES (:quizzId, 0, :answers, NOW())',
                {
                    replacements: {
                        quizzId: quizId,
                        answers: answersJson
                    }
                }
            );
        }

        return res.status(200).json({
            message: 'Quizz soumis avec succès',
            score: score,
            total: totalQCM,
            totalQuestions: questions.length,
            results: results
        });
    } catch (error) {
        console.error('Error submitting quiz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/api/quizzes', async (req, res) => {
    try {
        // check if the user is authenticated AND has 'ecole' or 'entreprise' role
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }
        const [userRows] = await sequelize.query(
            `SELECT id, role FROM users WHERE id = :userId AND actif = true`,
            {
                replacements: { userId: decoded.userId }
            }
        );
        if (!userRows || userRows.length === 0) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Vous n\'avez pas les droits nécessaires pour accéder à cette ressource',
            });
        }
        if (!['ecole', 'entreprise'].includes(userRows[0].role)) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Seuls les utilisateurs avec le rôle ecole ou entreprise peuvent créer des quizzs',
            });
        }
        const ownerId = userRows[0].id;
        const { name, questions } = req.body;
        if (!name || !questions) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Name and questions are required (send JSON body with Content-Type: application/json)'
            });
        }

        // Postgres / pg expects a JSON string for JSON columns — stringify it
        const questionsJson = JSON.stringify(questions);

        const [result] = await sequelize.query(
            // on force le cast en JSON côté SQL pour être sûr (:questions::json)
            'INSERT INTO quizzs (name, questions, ownerId, status, createdAt, updatedAt) VALUES (:name, :questions, :ownerId, \'pending\', NOW(), NOW())',
            { replacements: { name, questions: questionsJson, ownerId }}
        );

        // result[0] contient les rows retournées ; récupérer l'id en gardant la compatibilité
        const insertedRows = result[0];
        const insertedId = insertedRows?.id ?? null;

        return res.status(201).json({
            message: 'Quizz created successfully',
            quizz: { id: insertedId, name, questions, ownerId }
        });
    } catch (error) {
        console.error('Error creating quizz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Route pour récupérer un quiz
app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const quizId = req.params.id;
    
    // TODO: Récupérer le quiz depuis la base de données
    // const quiz = await sequelize.query('SELECT * FROM quizzs WHERE id = ?', { replacements: [quizId] });
    
    // Pour la démo, retourner un quiz exemple
    const quizExample = {
      id: quizId,
      name: 'Quiz Test',
      questions: [
        {
          id: 1,
          question: 'Quelle est la capitale de la France ?',
          type: 'qcm',
          choices: ['Paris', 'Lyon', 'Marseille']
        },
        {
          id: 2,
          question: 'Quel est ton nom ?',
          type: 'libre',
          choices: []
        }
      ]
    };
    
    res.json(quizExample);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Admin Routes
app.get('/api/admin/quizzes', async (req, res) => {
    try {
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        // Vérifier que l'utilisateur est admin
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

        // Récupérer tous les quizzes avec informations du propriétaire et nombre de participants
        const [quizzes] = await sequelize.query(
            `SELECT
                q.id,
                q.name,
                q.status,
                q.questions,
                q.ownerId,
                u.fullname as ownerName,
                COALESCE(COUNT(DISTINCT r.id), 0) as participants
             FROM quizzs q
             LEFT JOIN users u ON q.ownerId = u.id
             LEFT JOIN reponses r ON q.id = r.quizzId
             GROUP BY q.id, u.fullname
             ORDER BY q.id DESC`
        );

        // Formater les quizzes pour inclure le nombre de questions
        let formattedQuizzes = quizzes.map((quizz) => {
            return {
                id: quizz.id,
                name: quizz.name,
                status: quizz.status,
                ownerName: quizz.ownerName || 'N/A',
                questions: Array.isArray(quizz.questions)
                    ? quizz.questions.length
                    : (typeof quizz.questions === 'string'
                        ? JSON.parse(quizz.questions).length
                        : 0),
                participants: parseInt(quizz.participants) || 0
            };
        });

        return res.status(200).json({ quizzes: formattedQuizzes });
    } catch (error) {
        console.error('Error fetching admin quizzes:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.delete('/api/admin/quizzes/:id', async (req, res) => {
    try {
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        // Vérifier que l'utilisateur est admin
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

        const quizId = req.params.id;

        // Supprimer le quiz
        const [result] = await sequelize.query(
            'DELETE FROM quizzs WHERE id = :quizId',
            {
                replacements: { quizId }
            }
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quiz introuvable'
            });
        }

        return res.status(200).json({ message: 'Quiz supprimé avec succès' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/api/admin/quizzes/:id/toggle', async (req, res) => {
    try {
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        // Vérifier que l'utilisateur est admin
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

        const quizId = req.params.id;

        // Récupérer le statut actuel du quiz
        const [quizRows] = await sequelize.query(
            'SELECT status FROM quizzs WHERE id = :quizId LIMIT 1',
            {
                replacements: { quizId }
            }
        );

        if (!quizRows || quizRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quiz introuvable'
            });
        }

        const currentStatus = quizRows[0].status;
        let newStatus;

        // Déterminer le nouveau statut
        switch (currentStatus) {
            case 'pending':
                newStatus = 'started';
                break;
            case 'started':
                newStatus = 'finish';
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid operation',
                    message: `Impossible de changer le statut d'un quiz avec le statut '${currentStatus}'`
                });
        }

        // Mettre à jour le statut
        await sequelize.query(
            'UPDATE quizzs SET status = :status WHERE id = :quizId',
            {
                replacements: { status: newStatus, quizId }
            }
        );

        return res.status(200).json({
            message: `Statut du quiz mis à jour avec succès`,
            status: newStatus
        });
    } catch (error) {
        console.error('Error toggling quiz status:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/api/admin/users/:id/toggle', async (req, res) => {
    try {
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        // Vérifier que l'utilisateur est admin
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

        const userId = req.params.id;

        // Empêcher l'admin de se désactiver lui-même
        if (parseInt(userId) === decoded.userId) {
            return res.status(400).json({
                error: 'Opération invalide',
                message: 'Vous ne pouvez pas modifier votre propre statut'
            });
        }

        // Récupérer le statut actuel de l'utilisateur
        const [userRows] = await sequelize.query(
            'SELECT actif FROM users WHERE id = :userId LIMIT 1',
            {
                replacements: { userId }
            }
        );

        if (!userRows || userRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Utilisateur introuvable'
            });
        }

        const currentStatus = userRows[0].actif;
        const newStatus = !currentStatus;

        // Mettre à jour le statut
        await sequelize.query(
            'UPDATE users SET actif = :actif WHERE id = :userId',
            {
                replacements: { actif: newStatus, userId }
            }
        );

        return res.status(200).json({
            message: `Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`,
            actif: newStatus
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.get('/api/user/my-quizzes', async (req, res) => {
    try {
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        const userId = decoded.userId;

        // Récupérer tous les quiz auxquels l'utilisateur a participé
        const [participations] = await sequelize.query(
            `SELECT
                q.id as quizId,
                q.name as quizName,
                r.id as answerId,
                r.createdAt as submittedAt,
                r.answers,
                u.fullname as ownerName
             FROM reponses r
             JOIN quizzs q ON r.quizzId = q.id
             LEFT JOIN users u ON q.ownerId = u.id
             WHERE r.userId = :userId
             ORDER BY r.createdAt DESC`,
            {
                replacements: { userId }
            }
        );

        // Calculer les scores pour chaque participation
        const quizzesWithScores = participations.map(p => {
            const answers = typeof p.answers === 'string' ? JSON.parse(p.answers) : p.answers;

            let score = 0;
            let total = 0;

            if (Array.isArray(answers)) {
                answers.forEach(answer => {
                    if (answer.type === 'qcm') {
                        total++;
                        if (answer.isCorrect === true) {
                            score++;
                        }
                    }
                });
            }

            return {
                quizId: p.quizId,
                quizName: p.quizName,
                answerId: p.answerId,
                ownerName: p.ownerName || 'N/A',
                score: score,
                total: total,
                percentage: total > 0 ? Math.round((score / total) * 100) : 0,
                submittedAt: p.submittedAt
            };
        });

        return res.status(200).json({
            count: quizzesWithScores.length,
            quizzes: quizzesWithScores
        });
    } catch (error) {
        console.error('Error fetching user quizzes:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/api/quizz/generate', async (req, res) => {
    try {
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        const [userRows] = await sequelize.query(
            `SELECT id, role FROM users WHERE id = :userId AND actif = true`,
            {
                replacements: { userId: decoded.userId }
            }
        );

        if (!userRows || userRows.length === 0) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Vous n\'avez pas les droits nécessaires pour accéder à cette ressource'
            });
        }

        if (!['ecole', 'entreprise'].includes(userRows[0].role)) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Seuls les utilisateurs avec le rôle ecole ou entreprise peuvent créer des quizzs'
            });
        }

        const { theme, numQuestions } = req.body;

        if (!theme || !numQuestions) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Le thème et le nombre de questions sont requis'
            });
        }

        // Générer les questions avec Gemini AI
        const questions = await generateQuizWithGemini(theme, parseInt(numQuestions), userRows[0].role);

        return res.status(200).json({
            message: 'Questions générées avec succès',
            questions
        });
    } catch (error) {
        console.error('Error generating quizz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.get('/api/admin/online-users', async (req, res) => {
    try {
        const tokenCookie = req.cookies.token;

        if (!tokenCookie) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        // Vérifier que l'utilisateur est admin
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

        // Nettoyer les sessions inactives avant de retourner la liste
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        for (const [userId, userData] of onlineUsers.entries()) {
            if (userData.lastActivity < tenMinutesAgo) {
                onlineUsers.delete(userId);
            }
        }

        // Convertir la Map en tableau
        const onlineUsersList = Array.from(onlineUsers.values()).map(user => ({
            userId: user.userId,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            lastActivity: user.lastActivity
        }));

        return res.status(200).json({
            count: onlineUsersList.length,
            users: onlineUsersList
        });
    } catch (error) {
        console.error('Error fetching online users:', error);
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