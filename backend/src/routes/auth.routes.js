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
router.get("/config", async (req, res, next) => {
    try {
        const settings = await loadSettings();
        res.json({
            oidcEnabled: !!settings.oidcEnabled
        });
    } catch (error) {
        next(error);
    }
});

// Login
router.post("/login", async (req, res, next) => {
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
        next(error);
    }
});

// Initial Setup
router.post("/init", async (req, res, next) => {
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
        next(error);
    }
});

// OIDC Login Initiation
router.get('/oidc', async (req, res, next) => {
    try {
        const settings = await loadSettings();
        if (!settings.oidcEnabled) {
            return res.status(400).send("OIDC is not enabled");
        }
        await configurePassport();
        passport.authenticate('oidc')(req, res, next);
    } catch (error) {
        next(error);
    }
});

// OIDC Callback
router.get('/oidc/callback', (req, res, next) => {
    passport.authenticate('oidc', async (err, user, info) => {
        try {
            const settings = await loadSettings();
            const frontendUrl = settings.appUrl || process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
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
        } catch (error) {
            next(error);
        }
    })(req, res, next);
});

// Get Current User (Me)
router.get("/me", async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const userWithoutPass = req.user.toJSON();
        delete userWithoutPass.password;

        if (
            userWithoutPass.permissions &&
            userWithoutPass.permissions.includes("admin")
        ) {
            const settings = await loadSettings();
            userWithoutPass.lidarrUrl = settings.lidarrUrl;
            userWithoutPass.lidarrApiKey = settings.lidarrApiKey;
        }

        res.json(userWithoutPass);
    } catch (error) {
        next(error);
    }
});

// Update Profile
router.put("/profile", async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const { email, password } = req.body;

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
        next(error);
    }
});

export default router;
