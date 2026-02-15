import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
import { PERMISSIONS } from "../config/permissions.js";
import dotenv from "dotenv";

dotenv.config();

const getJwtSecret = () => process.env.JWT_SECRET || "your-secret-key-change-this";

export const authMiddleware = async (req, res, next) => {
    // Debug logging to trace requests
    // console.log(`🔍 AuthMiddleware: ${req.method} ${req.path}`);

    // Allow unauthenticated access to these endpoints
    if (
        req.path === "/api/health" ||
        req.path === "/api/auth/login" ||
        req.path === "/api/auth/init" ||
        req.path === "/api/auth/config" ||
        req.path.startsWith("/api/auth/oidc") ||
        /^\/api\/artists\/[0-9a-f-]+\/image$/.test(req.path) // Image proxy endpoint
    ) {
        return next();
    }

    // Accept token from header
    let token = req.headers.authorization?.split(" ")[1];
    // Only allow query param token for image proxy endpoint (avoids leaking tokens in logs/referrers)
    if (!token && req.query.token && /^\/api\/artists\/[0-9a-f-]+\/image$/.test(req.path)) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret);

        const user = await db.User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        // Attach Full Sequelize Model
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (req.user.permissions.includes(PERMISSIONS.ADMIN)) {
            return next();
        }

        if (permission && !req.user.permissions.includes(permission)) {
            return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }
        next();
    };
};

// Always use the getter so env vars are read fresh
export const JWT_SECRET = getJwtSecret();
