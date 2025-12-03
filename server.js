import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import { logger } from './controllers/LoggerController.js';
app.use((req, res, next) => {
    console.log('Request received:');
    logger(req, res);
    next();
});

import { sequelize } from './config/database.js';
import './seed.js';
import { loginUser } from './controllers/AuthController.js';
import { getUserById, registerUser } from './controllers/UserController.js';
import { verifyToken } from './controllers/TokenController.js';
import { createQuizz } from './controllers/QuizzController.js';

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
    if (user.role === 'entreprise') {
        return res.sendFile('public/create_quiz_entreprise.html', { root: '.' });
    } else if (user.role === 'ecole') {
        return res.sendFile('public/create_quiz_ecole.html', { root: '.' });
    }
    return res.redirect('/login');
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
            'SELECT * FROM quizzs WHERE ownerId = :ownerId',
            {
                replacements: { ownerId: ownerId } // TODO: remplacer par l'ID de l'utilisateur connecté
            }
        );

        let formattedQuizzes = quizzes.map((quiz) => {
            return {
                ...quiz,
                questions: Array.isArray(quiz.questions) 
                    ? quiz.questions.length 
                    : (typeof quiz.questions === 'string' 
                        ? JSON.parse(quiz.questions).length 
                        : 0)
            };
        });

        return res.status(200).json({ quizzes: formattedQuizzes });
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
                    message: `Cannot toggle quiz with status '${currentStatus}'`
                });
        }
        return res.status(200).json({ message: 'Quiz status updated successfully' });
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
        return res.status(200).json({ message: 'Quiz deleted successfully' });
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
        const quizId = req.params.id;
        const [quizRows] = await sequelize.query(
            "SELECT * FROM quizzs WHERE id = :quizId AND status = 'actif' LIMIT 1",
            {
                replacements: { quizId }
            }
        );
        if (!quizRows || quizRows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Quizz not found'
            });
        }
        const quiz = quizRows[0];
        
        // Parse questions if stored as string
        let questions = typeof quiz.questions === 'string' 
            ? JSON.parse(quiz.questions) 
            : quiz.questions;
        
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
        
        quiz.questions = questions;
        return res.status(200).json({ quiz });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/quizzes', async (req, res) => {
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

        const quizz = await createQuizz(name, questionsJson, ownerId);

        return res.status(201).json({
            message: 'Quizz created successfully',
            quizz
        });
    } catch (error) {
        console.error('Error creating quizz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

app.post('/api/quiz/generate', async (req, res) => {
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

        const { name, theme, numQuestions, specificQuestions } = req.body;

        const response = await fetch(`https://opentdb.com/api.php?amount=${numQuestions}&category=${theme}`);
        const data = await response.json();

        const questions = data.results.map(q => {
            const answers = [...q.incorrect_answers, q.correct_answer];
            answers.sort(() => Math.random() - 0.5);
            const correctAnswerIndex = answers.indexOf(q.correct_answer);

            return {
                text: q.question,
                type: q.type,
                answers: answers,
                correct: correctAnswerIndex
            }
        });

        if (specificQuestions) {
            questions.push(...specificQuestions);
        }

        const questionsJson = JSON.stringify(questions);

        const quizz = await createQuizz(name, questionsJson, ownerId);

        return res.status(201).json({
            message: 'Quiz generated successfully',
            quizz
        });
    } catch (error) {
        console.error('Error generating quizz:', error);
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