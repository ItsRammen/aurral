
import { db } from '../config/db.js';

async function checkPermissions() {
    try {
        const users = await db.User.findAll();
        console.log("--- User Permissions Check ---");
        users.forEach(u => {
            console.log(`User: ${u.username} (ID: ${u.id})`);
            console.log(`Permissions: ${JSON.stringify(u.permissions)}`);
            console.log("------------------------------");
        });
    } catch (error) {
        console.error("Error checking permissions:", error);
    }
}

checkPermissions();
