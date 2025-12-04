import { verifyToken } from '../controllers/TokenController.js';
import { getUserById } from '../controllers/UserController.js';

// Store pour tracker les utilisateurs connectés en mémoire
export const onlineUsers = new Map(); // userId -> { fullname, email, role, lastActivity, sessionId }

/**
 * Middleware pour mettre à jour l'activité des utilisateurs connectés
 */
export const trackOnlineUsers = async (req, res, next) => {
    const tokenCookie = req.cookies.token;

    if (tokenCookie) {
        try {
            const token = JSON.parse(tokenCookie);
            const decoded = await verifyToken(token);

            if (decoded && decoded.userId) {
                const user = await getUserById(decoded.userId);

                if (user && user.actif) {
                    // Mettre à jour ou ajouter l'utilisateur dans la liste des connectés
                    onlineUsers.set(decoded.userId, {
                        userId: decoded.userId,
                        fullname: user.fullname,
                        email: user.email,
                        role: user.role,
                        lastActivity: new Date(),
                        sessionId: req.sessionID
                    });

                    // Nettoyer les sessions inactives (plus de 10 minutes)
                    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
                    for (const [userId, userData] of onlineUsers.entries()) {
                        if (userData.lastActivity < tenMinutesAgo) {
                            onlineUsers.delete(userId);
                        }
                    }
                }
            }
        } catch (err) {
            // Ignorer les erreurs de token
        }
    }

    next();
};

/**
 * Helper function to get online users list
 */
export const getOnlineUsersList = () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Nettoyer les sessions inactives
    for (const [userId, userData] of onlineUsers.entries()) {
        if (userData.lastActivity < tenMinutesAgo) {
            onlineUsers.delete(userId);
        }
    }

    // Convertir la Map en tableau
    return Array.from(onlineUsers.values()).map(user => ({
        userId: user.userId,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        lastActivity: user.lastActivity
    }));
};
