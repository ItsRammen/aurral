import { sequelize, connectDB } from './database.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import AppConfig from '../models/AppConfig.js';
import ImageCache from '../models/ImageCache.js';
import Like from '../models/Like.js';
import Play from '../models/Play.js';
import MetadataCache from '../models/MetadataCache.js';

// Legacy LowDB export replacement
// We export the models so other files can import `db` and access `db.User`, etc.
// This is a common pattern in Express apps.

const db = {
    sequelize,
    connectDB,
    User,
    Request,
    AppConfig,
    ImageCache,
    Like,
    Play,
    MetadataCache,
};

// Start the connection
await connectDB();

export { db };
export const DATA_DIR = "../data"; // approximate
