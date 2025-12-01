import { sequelize } from "./server.js";
import bcrypt from "bcrypt";

const hashedAdminPassword = await bcrypt.hash("adminpassword", 10);
sequelize.query(`
    INSERT INTO users (fullname, username, password, role, actif) VALUES
    ('Admin User', 'admin', $1, 'admin', true)
    `,
    [hashedAdminPassword]
).then(() => {
    console.log("Admin account created.");
}).catch((err) => {
    console.error("Error creating admin account:", err);
});