
import { db } from '../config/db.js';

async function grantRequestPermission() {
    try {
        const users = await db.User.findAll();
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            const perms = new Set(user.permissions || []);

            // Add 'request' permission if not present
            if (!perms.has('request')) {
                perms.add('request');

                // Save back as array
                user.permissions = Array.from(perms);
                await user.save();
                console.log(`Granted 'request' permission to user: ${user.username}`);
            } else {
                console.log(`User ${user.username} already has 'request' permission.`);
            }
        }
        console.log("Migration complete.");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

grantRequestPermission();
