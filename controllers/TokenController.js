import jwt from 'jsonwebtoken';

export async function createToken(payload, expiresIn = '30d') {
    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
        }

        const token = jwt.sign(payload, secret, {
            expiresIn: expiresIn,
            algorithm: 'HS256'
        });

        return token;
    } catch (error) {
        throw new Error(`Erreur lors de la création du token: ${error.message}`);
    }
}


export async function verifyToken(token) {
    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET n\'est pas défini dans les variables d\'environnement');
        }

        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Le token a expiré');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Token invalide');
        } else {
            throw new Error(`Erreur lors de la vérification du token: ${error.message}`);
        }
    }
}

export async function decodeToken(token) {
    try {
        const decoded = jwt.decode(token, { complete: true });
        return decoded;
    } catch (error) {
        throw new Error(`Erreur lors du décodage du token: ${error.message}`);
    }
}

export async function authMiddleware(req, res, next) {
    try {
        // Récupérer le token depuis l'en-tête Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: 'Token manquant',
                message: 'Aucun token d\'authentification fourni'
            });
        }

        // Format attendu: "Bearer TOKEN"
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'Format de token invalide',
                message: 'Le format doit être: Bearer TOKEN'
            });
        }

        // Vérifier et décoder le token
        const decoded = await verifyToken(token);

        // Ajouter les données du token à la requête
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Authentification échouée',
            message: error.message
        });
    }
}
