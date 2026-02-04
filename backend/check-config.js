import { db } from './src/config/db.js';

const check = async () => {
    // Wait a bit for connection (since db.js connects on load)
    await new Promise(r => setTimeout(r, 1000));

    try {
        const config = await db.AppConfig.findByPk('main');
        console.log("--- AppConfig --");
        if (config) {
            console.log("OIDC Enabled:", config.oidcEnabled);
            console.log("OIDC Issuer:", config.oidcIssuerUrl);
            console.log("OIDC ClientID:", config.oidcClientId);
        } else {
            console.log("Config not found");
        }

        const users = await db.User.findAll();
        console.log("--- Users ---");
        console.log(`Count: ${users.length}`);
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
};

check();
