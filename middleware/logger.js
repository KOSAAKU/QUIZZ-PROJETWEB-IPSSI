import { logger } from '../controllers/LoggerController.js';

export const loggerMiddleware = (req, res, next) => {
    console.log('Request received:');
    logger(req, res);
    next();
};
