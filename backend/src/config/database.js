import { Sequelize } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(DATA_DIR, 'database.sqlite'),
    logging: false, // Set to console.log to see SQL queries
    define: {
        timestamps: true, // Adds createdAt and updatedAt automaticallly
    }
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('SQLite database connected successfully.');
        // Sync models with database
        // alter: true updates tables if models change without losing data
        await sequelize.sync({ alter: true });
        console.log('Database models synchronized.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

export { sequelize };
