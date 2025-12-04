import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from '../config/database.js';
import { verifyToken } from '../controllers/TokenController.js';
import { getUserById } from '../controllers/UserController.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';
import { generateQuizWithGemini } from '../controllers/GeminiController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// GET routes - Pages HTML
router.get('/create', authenticate, async (req, res) => {
    try {
        const user = await getUserById(req.userId);

        if (!user) {
            return res.redirect('/login');
        }

        if (user.role !== 'ecole' && user.role !== 'entreprise') {
            return res.redirect('/login');
        }

        if (user.role === 'ecole') {
            return res.sendFile(path.join(__dirname, '..', 'public', 'create_quizz_ecole.html'));
        } else if (user.role === 'entreprise') {
            return res.sendFile(path.join(__dirname, '..', 'public', 'create_quizz_entreprise.html'));
        }
    } catch (err) {
        console.error('Error in /quizz/create:', err);
        return res.redirect('/login');
    }
});

// API routes - IMPORTANT: Define specific routes before parameterized routes
router.get('/quizzes', authenticate, async (req, res) => {
    try {
        const [userRows] = await sequelize.query(
            `SELECT id, role FROM users WHERE id = :userId AND actif = true`,
            {
                replacements: { userId: req.userId }
            }
        );

        if (!userRows || userRows.length === 0) {
            return res.status(403).json({
                error: 'Accès refusé',
                message: 'Vous n\'avez pas les droits nécessaires'
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

router.get('/quizzes/:id', async (req, res) => {
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

router.get('/api/quizzes/:id/participants', authenticate, async (req, res) => {
    try {
        const quizId = req.params.id;

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

        if (quiz.ownerId !== req.userId) {
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

router.get('/api/quizzes/:id/answers/:answerId', authenticate, async (req, res) => {
    try {
        const { id: quizId, answerId } = req.params;

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

        if (quiz.ownerId !== req.userId) {
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

router.get('/:id/toggle', authenticate, async (req, res) => {
    try {
        const quizId = req.params.id;

        // get the quiz
        const [quizRows] = await sequelize.query(
            'SELECT status FROM quizzs WHERE id = :quizId AND ownerId = :ownerId LIMIT 1',
            {
                replacements: { quizId, ownerId: req.userId }
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
                await sequelize.query(
                    "UPDATE quizzs SET status = 'started' WHERE id = :quizId",
                    { replacements: { quizId }}
                );
                break;
            case 'started':
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
        console.error('Error toggling quiz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

router.delete('/:id/delete', authenticate, async (req, res) => {
    try {
        const quizId = req.params.id;

        // delete the quiz
        const [result] = await sequelize.query(
            'DELETE FROM quizzs WHERE id = :quizId AND ownerId = :ownerId',
            {
                replacements: { quizId, ownerId: req.userId }
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

router.post('/quizzes/:id/submit', optionalAuth, async (req, res) => {
    try {
        const quizId = req.params.id;
        const { answers } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Les réponses sont requises et doivent être un tableau'
            });
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
        let questions = typeof quizz.questions === 'string'
            ? JSON.parse(quizz.questions)
            : quizz.questions;

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
                isCorrect = userAnswer.answer === question.answer;
                if (isCorrect) {
                    score++;
                }
            } else if (question.type === 'libre') {
                isCorrect = null;
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

        const totalQCM = questions.filter(q => q.type === 'qcm').length;
        const answersJson = JSON.stringify(results);
        const userId = req.userId || 0;

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

router.post('/api/quizzes', authenticate, requireRole('ecole', 'entreprise'), async (req, res) => {
    try {
        const { name, questions } = req.body;

        if (!name || !questions) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Name and questions are required'
            });
        }

        const questionsJson = JSON.stringify(questions);

        const [result] = await sequelize.query(
            'INSERT INTO quizzs (name, questions, ownerId, status, createdAt, updatedAt) VALUES (:name, :questions, :ownerId, \'pending\', NOW(), NOW())',
            { replacements: { name, questions: questionsJson, ownerId: req.userId }}
        );

        const insertedRows = result[0];
        const insertedId = insertedRows?.id ?? null;

        return res.status(201).json({
            message: 'Quizz created successfully',
            quizz: { id: insertedId, name, questions, ownerId: req.userId }
        });
    } catch (error) {
        console.error('Error creating quizz:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

router.post('/api/quizz/generate', authenticate, requireRole('ecole', 'entreprise'), async (req, res) => {
    try {
        const { theme, numQuestions } = req.body;

        if (!theme || !numQuestions) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Le thème et le nombre de questions sont requis'
            });
        }

        // Générer les questions avec Gemini AI
        const questions = await generateQuizWithGemini(theme, parseInt(numQuestions), req.user.role);

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

// Legacy route - kept for compatibility
router.get('/api/quizzes/:id', async (req, res) => {
    const quizId = req.params.id;

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
});

// Parameterized routes must be LAST to avoid conflicts with specific routes
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const quizId = req.params.id;

        // Check if user is authenticated
        if (!req.userId) {
            // Redirect to login with the quiz URL as redirect parameter
            return res.redirect(`/login?redirect=${encodeURIComponent('/quizz/' + quizId)}`);
        }

        const user = await getUserById(req.userId);
        if (!user) {
            return res.redirect(`/login?redirect=${encodeURIComponent('/quizz/' + quizId)}`);
        }

        res.sendFile(path.join(__dirname, '..', 'public', 'quizz.html'));
    } catch (err) {
        console.error('Error in /quizz/:id:', err);
        return res.redirect('/login');
    }
});

export default router;
