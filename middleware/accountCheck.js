import { verifyToken } from '../controllers/TokenController.js';
import { getUserById } from '../controllers/UserController.js';

/**
 * Middleware to check if the user account is active before proceeding
 */
export const checkAccountActive = async (req, res, next) => {
    const tokenCookie = req.cookies.token;

    // if route is for assets, skip the check
    if (req.path.startsWith('/assets/')) {
        return next();
    }

    if (tokenCookie) {
        try {
            const token = JSON.parse(tokenCookie);
            const decoded = await verifyToken(token);

            if (decoded && decoded.userId) {
                const user = await getUserById(decoded.userId);
                if (user && !user.actif) {
                    return res.sendFile('public/suspended.html', { root: '.' });
                }
            }

            next();
        } catch (err) {
            console.error('Error verifying token in account active check:', err);
            return res.status(400).send('Invalid token.');
        }
    } else {
        next();
    }
};
