import express from 'express';
import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Tous les routes user nécessitent l'authentification
router.use(authenticate);

router.get('/users', async (req, res) => {
    try {
        const [users] = await sequelize.query(
            'SELECT id, fullname, email, role, actif FROM users'
        );
        return res.status(200).json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

router.get('/api/user/my-quizzes', async (req, res) => {
    try {
        const userId = req.userId;

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

export default router;
