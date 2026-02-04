import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Op } from "sequelize";
import { db } from "../config/db.js";
import { requirePermission } from "../middleware/auth.js";

const router = express.Router();

// Helper to check for admin or manage_users permission
const ensureUserManagement = (req, res, next) => {
    if (req.user && (req.user.permissions.includes("admin") || req.user.permissions.includes("manage_users"))) {
        return next();
    }
    res.status(403).json({ error: "Forbidden: Insufficient permissions" });
};

// GET /api/users - List all users (Admin)
router.get("/", requirePermission("manage_users"), async (req, res) => {
    try {
        const users = await db.User.findAll({
            attributes: { exclude: ['password'] }
        });

        // Get request counts for each user
        // We can do this with a group by query or just iterate if n is small
        // For strict correctness with Sequelize:
        const usersWithCounts = await Promise.all(users.map(async (u) => {
            const requestCount = await db.Request.count({ where: { requestedByUserId: u.id } });
            return { ...u.toJSON(), requestCount };
        }));

        res.json(usersWithCounts);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /api/users - Create User (Admin)
router.post("/", requirePermission("manage_users"), async (req, res) => {
    const { username, password, email, permissions } = req.body;

    try {
        const existing = await db.User.findOne({ where: { username } });
        if (existing) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await db.User.create({
            id: crypto.randomUUID(),
            username,
            email: email || null,
            password: hashedPassword,
            permissions: permissions || ["read_only"],
            authType: 'local'
        });

        const { password: _, ...userWithoutPass } = newUser.toJSON();
        res.status(201).json(userWithoutPass);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// PUT /api/users/:id - Update User (Admin)
router.put("/:id", requirePermission("manage_users"), async (req, res) => {
    const { id } = req.params;
    const { username, password, email, permissions } = req.body;

    try {
        const targetUser = await db.User.findByPk(id);
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        // Protect OIDC Users
        if (targetUser.authType === 'oidc') {
            if (password || (email && email !== targetUser.email) || (username && username !== targetUser.username)) {
                return res.status(400).json({ error: "Cannot modify credentials or username for SSO users. Manage them in your Identity Provider." });
            }
        }

        // Prevent removing last admin
        if (targetUser.permissions.includes('admin') &&
            permissions && !permissions.includes('admin')) {
            // Fetch all users and filter in memory for simplicity and SQLite compatibility
            const allUsers = await db.User.findAll();
            const adminCount = allUsers.filter(u => u.permissions.includes('admin')).length;

            if (adminCount <= 1) {
                return res.status(400).json({ error: "Cannot remove the last admin" });
            }
        }

        const updates = {};
        if (username) updates.username = username;
        if (email !== undefined) updates.email = email;
        if (password) updates.password = await bcrypt.hash(password, 10);
        if (permissions) updates.permissions = permissions;

        await targetUser.update(updates);

        const { password: _, ...userWithoutPass } = targetUser.toJSON();
        res.json(userWithoutPass);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});

// DELETE /api/users/:id - Delete User (Admin)
router.delete("/:id", requirePermission("manage_users"), async (req, res) => {
    const { id } = req.params;

    try {
        const targetUser = await db.User.findByPk(id);
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        if (targetUser.authType === 'oidc') {
            return res.status(400).json({ error: "Cannot delete SSO users locally. Please remove them from your Identity Provider." });
        }

        if (targetUser.permissions.includes('admin')) {
            const allUsers = await db.User.findAll();
            const adminCount = allUsers.filter(u => u.permissions.includes('admin')).length;
            if (adminCount <= 1) {
                return res.status(400).json({ error: "Cannot delete the last admin" });
            }
        }

        await targetUser.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// GET /api/users/:id/stats - User Profile Stats
router.get("/:id/stats", async (req, res) => {
    const { id } = req.params;

    // Allow users to view their own stats or admins to view any
    if (req.user.id !== id && !req.user.permissions.includes("admin") && !req.user.permissions.includes("manage_users")) {
        return res.status(403).json({ error: "Forbidden" });
    }

    try {
        const user = await db.User.findByPk(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const userRequests = await db.Request.findAll({
            where: { requestedByUserId: id },
            order: [['timestamp', 'DESC']]
        });

        const userLikes = await db.Like.findAll({
            where: { userId: id }
        });

        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const requestsThisMonth = userRequests.filter(r => new Date(r.timestamp) >= thisMonthStart).length;
        const requestsLastMonth = userRequests.filter(r => {
            const d = new Date(r.timestamp);
            return d >= lastMonthStart && d <= lastMonthEnd;
        }).length;

        const likesThisMonth = userLikes.filter(l => new Date(l.updatedAt || new Date()) >= thisMonthStart).length;
        const likesLastMonth = userLikes.filter(l => {
            const d = new Date(l.updatedAt || new Date());
            return d >= lastMonthStart && d <= lastMonthEnd;
        }).length;

        const recentRequests = userRequests.slice(0, 10).map(r => ({
            id: r.uniqueId,
            mbid: r.mbid,
            artistName: r.artistName,
            timestamp: r.timestamp,
            status: r.status
        }));

        const recentLikes = userLikes.slice(0, 10).map(l => ({
            mbid: l.mbid,
            artistName: l.artistName,
            timestamp: l.updatedAt || new Date()
        }));

        const genreCounts = new Map();
        [...userRequests, ...userLikes].forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.slice(0, 3).forEach(tag => {
                    genreCounts.set(tag, (genreCounts.get(tag) || 0) + 1);
                });
            }
            if (item.genres && Array.isArray(item.genres)) {
                item.genres.forEach(genre => {
                    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
                });
            }
        });

        const topGenres = Array.from(genreCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({ name, count }));

        const userCreated = new Date(user.createdAt || Date.now());
        const accountAgeDays = Math.floor((now - userCreated) / (1000 * 60 * 60 * 24));
        const monitoredRequests = userRequests.filter(r => r.status === "monitored").length;
        const uniqueGenres = new Set();
        [...userRequests, ...userLikes].forEach(item => {
            (item.tags || []).slice(0, 2).forEach(t => uniqueGenres.add(t.toLowerCase()));
            (item.genres || []).forEach(g => uniqueGenres.add(g.toLowerCase()));
        });

        const achievements = [
            {
                id: "first_request",
                name: "First Request",
                description: "Made your first artist request",
                icon: "🎵",
                unlocked: userRequests.length >= 1,
                unlockedAt: userRequests.length >= 1 ? userRequests[userRequests.length - 1]?.timestamp : null
            },
            {
                id: "music_lover",
                name: "Music Lover",
                description: "Liked 10 or more artists",
                icon: "❤️",
                unlocked: userLikes.length >= 10,
                progress: Math.min(userLikes.length, 10),
                total: 10
            },
            {
                id: "power_user",
                name: "Power User",
                description: "Made 25 or more requests",
                icon: "🔥",
                unlocked: userRequests.length >= 25,
                progress: Math.min(userRequests.length, 25),
                total: 25
            },
            {
                id: "trendsetter",
                name: "Trendsetter",
                description: "Had a request added to the library",
                icon: "🌟",
                unlocked: monitoredRequests >= 1,
                progress: monitoredRequests,
                total: 1
            },
            {
                id: "genre_explorer",
                name: "Genre Explorer",
                description: "Explored 5 or more genres",
                icon: "🎸",
                unlocked: uniqueGenres.size >= 5,
                progress: Math.min(uniqueGenres.size, 5),
                total: 5
            },
            {
                id: "veteran",
                name: "Veteran",
                description: "Account older than 30 days",
                icon: "👑",
                unlocked: accountAgeDays >= 30,
                progress: Math.min(accountAgeDays, 30),
                total: 30
            }
        ];

        res.json({
            totalRequests: userRequests.length,
            totalLikes: userLikes.length,
            recentRequests,
            recentLikes,
            topGenres,
            achievements,
            monthlyStats: {
                requestsThisMonth,
                requestsLastMonth,
                requestsChange: requestsThisMonth - requestsLastMonth,
                likesThisMonth,
                likesLastMonth,
                likesChange: likesThisMonth - likesLastMonth
            },
            accountAge: accountAgeDays
        });
    } catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

// GET /api/users/:id/avatar
router.get("/:id/avatar", async (req, res) => {
    const { id } = req.params;
    try {
        const user = await db.User.findByPk(id);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ avatar: user.avatar || null });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch avatar" });
    }
});

// POST /api/users/:id/avatar
router.post("/:id/avatar", async (req, res) => {
    const { id } = req.params;

    if (req.user.id !== id && !req.user.permissions.includes("admin")) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: "Avatar data required" });
    if (!avatar.startsWith("data:image/")) return res.status(400).json({ error: "Invalid image format" });
    if (avatar.length > 700000) return res.status(400).json({ error: "Image too large. Max 500KB." });

    try {
        const user = await db.User.findByPk(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.avatar = avatar;
        await user.save();

        res.json({ success: true, avatar });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Failed to update avatar" });
    }
});

// DELETE /api/users/:id/avatar
router.delete("/:id/avatar", async (req, res) => {
    const { id } = req.params;

    if (req.user.id !== id && !req.user.permissions.includes("admin")) {
        return res.status(403).json({ error: "Forbidden" });
    }

    try {
        const user = await db.User.findByPk(id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.avatar = null;
        await user.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete avatar" });
    }
});

export default router;
