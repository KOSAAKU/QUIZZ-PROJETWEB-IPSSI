import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyToken } from '../controllers/TokenController.js';
import { getUserById } from '../controllers/UserController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/dashboard', async (req, res) => {
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
            return res.sendFile(path.join(__dirname, '..', 'public', 'dashbadmin.html'));
        case 'ecole':
            console.log('Dashboard - sending ecole dashboard');
            return res.sendFile(path.join(__dirname, '..', 'public', 'dashbecole.html'));
        case 'entreprise':
            console.log('Dashboard - sending entreprise dashboard');
            return res.sendFile(path.join(__dirname, '..', 'public', 'dashbentreprise.html'));
        case 'user':
            console.log('Dashboard - sending user dashboard');
            return res.sendFile(path.join(__dirname, '..', 'public', 'dashbuser.html'));
        default:
            console.log('Dashboard - invalid role, redirecting to login');
            return res.redirect('/login');
    }
});

export default router;
