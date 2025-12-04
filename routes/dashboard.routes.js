import express from 'express';
import { verifyToken } from '../controllers/TokenController.js';
import { getUserById } from '../controllers/UserController.js';

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

export default router;
