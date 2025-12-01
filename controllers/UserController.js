import { sequelize } from '../server.js';
import bcrypt from 'bcrypt';

export async function registerUser(fullname, username, password, role, actif) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await sequelize.query(
        'INSERT INTO users (fullname, username, password, role, actif) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [fullname, username, hashedPassword, role, actif]
    );

    return { id: result[0].id, fullname, username, role, actif };
}

export async function getUserById(userId) {
    const result = await sequelize.query(
        'SELECT id, fullname, username, role, actif FROM users WHERE id = $1',
        [userId]
    );
    return result.length > 0 ? result[0] : null;
}

export async function disableUser(userId) {
    await sequelize.query(
        'UPDATE users SET actif = false WHERE id = $1',
        [userId]
    );
}

export async function enableUser(userId) {
    await sequelize.query(
        'UPDATE users SET actif = true WHERE id = $1',
        [userId]
    );
}