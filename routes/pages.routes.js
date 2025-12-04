import express from 'express';
import { verifyToken } from '../controllers/TokenController.js';
import { getUserById } from '../controllers/UserController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Dashboard quiz pages
router.get('/dashboard/quizz/:id/:answerId', authenticate, requireRole('ecole', 'entreprise'), async (req, res) => {
    res.sendFile('public/quiz_answers.html', { root: '.' });
});

router.get('/dashboard/quizz/:id', authenticate, requireRole('ecole', 'entreprise'), async (req, res) => {
    res.sendFile('public/quiz_participants.html', { root: '.' });
});

export default router;
