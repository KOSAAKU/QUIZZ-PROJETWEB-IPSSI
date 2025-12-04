import { verifyToken } from '../controllers/TokenController.js';
import { getUserById } from '../controllers/UserController.js';

/**
 * Middleware to verify authentication and attach user to request
 */
export const authenticate = async (req, res, next) => {
    const tokenCookie = req.cookies.token;

    if (!tokenCookie) {
        return res.status(401).json({
            error: 'Token manquant',
            message: 'Aucun token d\'authentification fourni'
        });
    }

    try {
        const token = JSON.parse(tokenCookie);
        const decoded = await verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                error: 'Token invalide',
                message: 'Le token fourni est invalide'
            });
        }

        req.userId = decoded.userId;
        next();
    } catch (err) {
        console.error('Error parsing token cookie:', err);
        return res.status(400).json({
            error: 'Invalid token format',
            message: 'Le format du token est invalide'
        });
    }
};

/**
 * Middleware to check if user has required role
 */
export const requireRole = (...roles) => {
    return async (req, res, next) => {
        try {
            const user = await getUserById(req.userId);

            if (!user) {
                return res.status(403).json({
                    error: 'Accès refusé',
                    message: 'Utilisateur introuvable'
                });
            }

            if (!user.actif) {
                return res.status(403).json({
                    error: 'Compte suspendu',
                    message: 'Votre compte a été désactivé'
                });
            }

            if (!roles.includes(user.role)) {
                return res.status(403).json({
                    error: 'Accès refusé',
                    message: 'Vous n\'avez pas les droits nécessaires'
                });
            }

            req.user = user;
            next();
        } catch (err) {
            console.error('Error in requireRole middleware:', err);
            return res.status(500).json({
                error: 'Internal server error',
                message: err.message
            });
        }
    };
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
    const tokenCookie = req.cookies.token;

    if (tokenCookie) {
        try {
            const token = JSON.parse(tokenCookie);
            const decoded = await verifyToken(token);

            if (decoded) {
                req.userId = decoded.userId;
                const user = await getUserById(decoded.userId);
                if (user && user.actif) {
                    req.user = user;
                }
            }
        } catch (err) {
            // Ignore errors for optional auth
        }
    }

    next();
};
