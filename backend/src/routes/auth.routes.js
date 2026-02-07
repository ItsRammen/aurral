import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import passport from "passport";
import { db } from "../config/db.js";
import { JWT_SECRET } from "../middleware/auth.js";
import { configurePassport } from "../config/passport.js";
import { loadSettings } from "../services/api.js";

const router = express.Router();

// Public: Get Auth Config (OIDC Status)
router.get("/config", async (req, res) => {
    const settings = await loadSettings();
    res.json({
        oidcEnabled: !!settings.oidcEnabled
    });
});

// Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db.User.findOne({ where: { username } });

        if (!user || user.password === null || !(await bcrypt.compare(password, user.password))) {
            // user.password === null check for OIDC users trying to login with password
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, permissions: user.permissions },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                permissions: user.permissions,
                avatar: user.avatar,
                navidromeUsername: user.navidromeUsername,
                navidromeUserToken: user.navidromeUserToken
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// Initial Setup
router.post("/init", async (req, res) => {
    try {
        const userCount = await db.User.count();
        if (userCount > 0) {
            return res.status(400).json({ error: "Setup already completed" });
        }

        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await db.User.create({
            id: crypto.randomUUID(),
            username,
            password: hashedPassword,
            permissions: ["admin"],
            authType: 'local'
        });

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, email: newUser.email, permissions: newUser.permissions },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                permissions: newUser.permissions,
                avatar: newUser.avatar,
                navidromeUsername: newUser.navidromeUsername,
                navidromeUserToken: newUser.navidromeUserToken
            }
        });
    } catch (error) {
        console.error("Init Error:", error);
        res.status(500).json({ error: "Setup failed" });
    }
});

// OIDC Login Initiation
router.get('/oidc', async (req, res, next) => {
    const settings = await loadSettings();
    if (!settings.oidcEnabled) {
        return res.status(400).send("OIDC is not enabled");
    }
    // Re-configure in case settings changed
    // configurePassport needs to be async or handle settings loading internally?
    // Checking configurePassport implementation next, assuming it reads from DB or we pass settings.
    // For now assuming existing behavior but triggered.
    configurePassport();
    passport.authenticate('oidc')(req, res, next);
});

// OIDC Callback
// Helper to get frontend URL
const getFrontendUrl = Async => {
    // We can't use async here easily inside the callback if we want to keep it clean, 
    // but we can use the env vars as quick fallback or better yet, assume the callback handles it.
    // Actually, we can make the route async.
    return process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
};

// We need to load settings to get appUrl roughly.
import { loadSettings } from "../services/api.js";

router.get('/oidc/callback', (req, res, next) => {
    passport.authenticate('oidc', async (err, user, info) => {
        const settings = await loadSettings();
        const frontendUrl = settings.appUrl || process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
        // Remove trailing slash
        const cleanFrontendUrl = frontendUrl.replace(/\/$/, '');

        if (err) {
            console.error("OIDC Authentication Error:", err);
            return res.redirect(`${cleanFrontendUrl}/login?error=${encodeURIComponent(err.message || 'oidc_error')}`);
        }
        if (!user) {
            console.error("OIDC Authentication Failed (No User):", info);
            const errorMsg = info?.message || 'oidc_failed';
            return res.redirect(`${cleanFrontendUrl}/login?error=${encodeURIComponent(errorMsg)}`);
        }

        // Successful authentication
        req.logIn(user, (err) => {
            if (err) {
                console.error("Req.logIn failed:", err);
                return res.redirect(`${cleanFrontendUrl}/login?error=login_session_failed`);
            }

            const token = jwt.sign(
                { id: user.id, username: user.username, email: user.email, permissions: user.permissions },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.redirect(`${cleanFrontendUrl}/login?token=${token}`);
        });
    })(req, res, next);
});

// Get Current User (Me)
router.get("/me", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    // req.user is a Sequelize instance
    const userWithoutPass = req.user.toJSON();
    delete userWithoutPass.password;

    // Securely inject Lidarr configuration for admin users only
    if (
        userWithoutPass.permissions &&
        userWithoutPass.permissions.includes("admin")
    ) {
        const settings = await loadSettings();
        userWithoutPass.lidarrUrl = settings.lidarrUrl;
        userWithoutPass.lidarrApiKey = settings.lidarrApiKey;
    }

    res.json(userWithoutPass);
});

// Update Profile
router.put("/profile", async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const { email, password } = req.body;

    try {
        const updates = {};
        if (email !== undefined) updates.email = email;
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }

        await req.user.update(updates);

        const userWithoutPass = req.user.toJSON();
        delete userWithoutPass.password;

        res.json(userWithoutPass);
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

export default router;
