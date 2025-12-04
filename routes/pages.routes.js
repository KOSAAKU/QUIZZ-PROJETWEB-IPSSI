import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyToken } from '../controllers/TokenController.js';
import { getUserById } from '../controllers/UserController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Dashboard quiz pages
router.get('/dashboard/quizz/:id/:answerId', authenticate, requireRole('ecole', 'entreprise'), async (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'quiz_answers.html'));
});

router.get('/dashboard/quizz/:id', authenticate, requireRole('ecole', 'entreprise'), async (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'quiz_participants.html'));
});

export default router;
