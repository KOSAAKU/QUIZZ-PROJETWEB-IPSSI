import express from 'express';
import { sequelize } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getOnlineUsersList } from '../middleware/onlineUsers.js';

const router = express.Router();

// Tous les routes admin nécessitent l'authentification et le rôle admin
router.use(authenticate);
router.use(requireRole('admin'));

// Users management
router.get('/api/admin/users', async (req, res) => {
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

router.post('/api/admin/users/:id/toggle', async (req, res) => {
    try {
        const userId = req.params.id;

        // Empêcher l'admin de se désactiver lui-même
        if (parseInt(userId) === req.userId) {
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

// Quizzes management
router.get('/api/admin/quizzes', async (req, res) => {
    try {
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

router.delete('/api/admin/quizzes/:id', async (req, res) => {
    try {
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

router.post('/api/admin/quizzes/:id/toggle', async (req, res) => {
    try {
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

// Online users tracking
router.get('/api/admin/online-users', async (req, res) => {
    try {
        const onlineUsersList = getOnlineUsersList();

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

export default router;
