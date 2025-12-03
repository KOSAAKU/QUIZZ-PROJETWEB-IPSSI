import { sequelize } from '../config/database.js';
import bcrypt from 'bcrypt';

export async function registerUser(fullname, email, password, role, actif) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await sequelize.query(
        'INSERT INTO users (fullname, email, password, role, actif) VALUES (:fullname, :email, :password, :role, :actif)',
        {
            replacements: { fullname, email, password: hashedPassword, role, actif }
        }
    );

    const [idResult] = await sequelize.query('SELECT LAST_INSERT_ID() as id');
    return { id: idResult[0].id, fullname, email, role, actif };
}

export async function getUserById(userId) {
    const result = await sequelize.query(
        'SELECT id, fullname, email, role, actif FROM users WHERE id = :userId',
        { replacements: { userId }}
    );
    return result.length > 0 ? result[0][0] : null;
}

export async function disableUser(userId) {
    await sequelize.query(
        'UPDATE users SET actif = false WHERE id = :userId',
        { replacements: { userId }}
    );
}

export async function enableUser(userId) {
    await sequelize.query(
        'UPDATE users SET actif = true WHERE id = :userId',
        { replacements: { userId }}
    );
}