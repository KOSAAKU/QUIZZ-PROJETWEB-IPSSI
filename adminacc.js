import { sequelize } from "./config/database.js";
import bcrypt from "bcrypt";

const hashedAdminPassword = await bcrypt.hash("adminpassword", 10);
sequelize.query(`
    INSERT INTO users (fullname, email, password, role, actif, createdAt, updatedAt) VALUES
    ('Admin User', 'admin@quizzeo.fr', :password, 'admin', true, NOW(), NOW())
    `,
    {
        replacements: { password: hashedAdminPassword }
    }
).then(() => {
    console.log("Admin account created.");
}).catch((err) => {
    console.error("Error creating admin account:", err);
});