import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, sequelize } from '../config/database.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import AppConfig from '../models/AppConfig.js';
import ImageCache from '../models/ImageCache.js';
import Like from '../models/Like.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_JSON_PATH = path.join(__dirname, '../../data/db.json');

const migrate = async () => {
    console.log('Starting migration from lowdb to SQLite...');

    let dbPath = DB_JSON_PATH;
    if (!fs.existsSync(dbPath)) {
        const migratedPath = path.join(__dirname, '../../data/db.json.migrated');
        if (fs.existsSync(migratedPath)) {
            console.log('db.json not found, using db.json.migrated...');
            dbPath = migratedPath;
        } else {
            console.error('db.json not found! Cannot migrate.');
            process.exit(1);
        }
    }

    const rawData = fs.readFileSync(dbPath, 'utf-8');
    const oldDb = JSON.parse(rawData);

    await connectDB();
    await sequelize.sync({ force: true }); // Reset database
    console.log("Database synced and cleared.");

    try {
        await sequelize.transaction(async (t) => {
            // 1. Migrate Users
            if (oldDb.users && oldDb.users.length > 0) {
                console.log(`Migrating ${oldDb.users.length} users...`);
                // Ensure authType and permissions are set if missing
                const users = oldDb.users.map(u => ({
                    ...u,
                    authType: u.authType || 'local',
                    permissions: u.isAdmin ? ['admin', 'request'] : (u.permissions || ['request']),
                    navidromeToken: u.navidromeUserToken
                }));
                await User.bulkCreate(users, { transaction: t, ignoreDuplicates: true });
            }

            // 2. Migrate Requests
            if (oldDb.requests && oldDb.requests.length > 0) {
                console.log(`Migrating ${oldDb.requests.length} requests...`);
                // Map old structure to new if needed, currently they match reasonably well
                const requests = oldDb.requests.map(r => ({
                    mbid: r.mbid,
                    artistName: r.name || r.artistName, // Fix: Map name to artistName
                    status: r.status || 'pending',
                    requestedBy: r.requestedBy,
                    requestedByUserId: r.requestedByUserId,
                    timestamp: r.requestedAt ? new Date(r.requestedAt) : new Date(), // Fix: Map requestedAt to timestamp
                    foreignArtistId: r.lidarrId || r.foreignArtistId,
                    tags: r.tags || [],
                    genres: r.genres || [],
                    requestData: r.requestData || null
                }));
                await Request.bulkCreate(requests, { transaction: t, ignoreDuplicates: true });
            }

            // 3. Migrate Settings
            if (oldDb.settings) {
                console.log('Migrating settings...');
                await AppConfig.create({
                    key: 'main',
                    ...oldDb.settings,
                    discoveryLastRun: oldDb.discovery?.lastUpdated ? new Date(oldDb.discovery.lastUpdated) : null,
                    discoveryData: oldDb.discovery || null
                }, { transaction: t, ignoreDuplicates: true });
            }

            // 4. Migrate Image Cache
            if (oldDb.images) {
                const imageEntries = Object.entries(oldDb.images).map(([mbid, url]) => ({
                    mbid,
                    url: typeof url === 'string' ? url : url?.url || JSON.stringify(url), // Handle complex objects if any
                    data: typeof url === 'object' ? url : null
                }));
                console.log(`Migrating ${imageEntries.length} cached images...`);
                // Chunk inserting images to avoid "too many variables" in SQL
                const chunkSize = 100;
                for (let i = 0; i < imageEntries.length; i += chunkSize) {
                    await ImageCache.bulkCreate(imageEntries.slice(i, i + chunkSize), { transaction: t, ignoreDuplicates: true });
                }
            }

            // 5. Migrate Likes
            if (oldDb.likes && oldDb.likes.length > 0) {
                console.log(`Migrating ${oldDb.likes.length} likes...`);
                const likes = oldDb.likes.map(l => {
                    if (typeof l === 'string') return { mbid: l };
                    return {
                        mbid: l.id || l.mbid,
                        artistName: l.name || l.artistName,
                        artistImage: l.image,
                        userId: l.userId, // Ensure UserID is migrated for likes
                        likedAt: l.likedAt // Ensure likedAt timestamp if available
                    };
                });
                await Like.bulkCreate(likes, { transaction: t, ignoreDuplicates: true });
            }
        });

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
