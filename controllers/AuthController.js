import { sequelize } from '../config/database.js';
import { createToken } from './TokenController.js';
import bcrypt from 'bcrypt';

export async function loginUser(email, password) {
    const [results] = await sequelize.query(
        'SELECT * FROM users WHERE email = :email',
        {
            replacements: { email }
        }
    );

    if (results.length === 0) {
        return null; // User not found
    }
    const user = results[0];

    const match = await bcrypt.compare(password, user.password);
    if (match) {
        const token = await createToken({ userId: user.id, email: user.email });
        return { fullname: user.fullname, email: user.email, token };
    }
    return null; // Authentication failed
}