import { sequelize } from '../server.js';
import { createToken } from './TokenController.js';
import bcrypt from 'bcrypt';

export async function loginUser(email, password) {
    const result = await sequelize.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );

    if (result.length === 0) {
        return null; // User not found
    }
    const user = result[0];

    const match = await bcrypt.compare(password, user.password);
    if (match) {
        const token = await createToken({ userId: user.id, email: user.email });
        return { fullname: user.fullname, email: user.email, token };
    }
    return null; // Authentication failed
}