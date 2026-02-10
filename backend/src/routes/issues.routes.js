import express from "express";
import { db } from "../config/db.js";
import { requirePermission } from "../middleware/auth.js";
const router = express.Router();

const ALLOWED_TYPES = [
    'download_failed',
    'import_failed',
    'stuck_download',
    'quality_issue',
    'other'
];

const ALLOWED_SEVERITIES = ['info', 'warning', 'error'];
const ALLOWED_STATUSES = ['open', 'resolved', 'ignored'];

/**
 * GET /api/issues
 * Get all issues with optional filters
 */
router.get("/", async (req, res) => {
    try {
        const { status, type, limit = 50, offset = 0 } = req.query;

        const where = {};
        if (status) where.status = status;
        if (type) where.type = type;

        const issues = await db.Issue.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        // Get counts by status
        const openCount = await db.Issue.count({ where: { status: 'open' } });
        const resolvedCount = await db.Issue.count({ where: { status: 'resolved' } });
        const ignoredCount = await db.Issue.count({ where: { status: 'ignored' } });

        res.json({
            issues: issues.rows,
            total: issues.count,
            counts: {
                open: openCount,
                resolved: resolvedCount,
                ignored: ignoredCount,
            }
        });
    } catch (error) {
        console.error("Failed to fetch issues:", error);
        res.status(500).json({ error: "Failed to fetch issues", message: error.message });
    }
});

/**
 * POST /api/issues
 * Create a new issue (user-submitted or system)
 */
router.post("/", async (req, res) => {
    try {
        const {
            type,
            severity = "warning",
            title,
            message,
            artistId,
            artistName,
            artistMbid,
            albumId,
            albumTitle,
            metadata = {}
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }
        if (!type) {
            return res.status(400).json({ error: "Issue type is required" });
        }
        if (!ALLOWED_TYPES.includes(type)) {
            return res.status(400).json({ error: `Invalid issue type. Allowed: ${ALLOWED_TYPES.join(', ')}` });
        }
        if (!ALLOWED_SEVERITIES.includes(severity)) {
            return res.status(400).json({ error: `Invalid severity. Allowed: ${ALLOWED_SEVERITIES.join(', ')}` });
        }

        const issue = await db.Issue.create({
            type,
            severity,
            title,
            message,
            artistId,
            artistName,
            artistMbid,
            albumId,
            albumTitle,
            metadata: {
                ...metadata,
                reportedBy: req.user?.username || "anonymous",
                reportedAt: new Date().toISOString(),
            }
        });

        res.status(201).json(issue);
    } catch (error) {
        console.error("Failed to create issue:", error);
        res.status(500).json({ error: "Failed to create issue", message: error.message });
    }
});

/**
 * GET /api/issues/:id
 * Get single issue by ID
 */
router.get("/:id", async (req, res) => {
    try {
        const issue = await db.Issue.findByPk(req.params.id);
        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }
        res.json(issue);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch issue", message: error.message });
    }
});

/**
 * PATCH /api/issues/:id
 * Update issue (resolve, ignore, reopen)
 * Protected: Requires admin or manage_requests
 */
router.patch("/:id", (req, res, next) => {
    if (req.user.permissions.includes("admin") || req.user.permissions.includes("manage_requests")) return next();
    res.status(403).json({ error: "Forbidden: Insufficient permissions" });
}, async (req, res) => {
    try {
        const issue = await db.Issue.findByPk(req.params.id);
        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        const { status, resolution } = req.body;
        const updates = {};

        if (status) {
            if (!ALLOWED_STATUSES.includes(status)) {
                return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
            }
            updates.status = status;
            if (status === 'resolved') {
                updates.resolvedAt = new Date();
                updates.resolvedBy = req.user?.username || 'system';
            }
            if (status === 'open') {
                updates.resolvedAt = null;
                updates.resolvedBy = null;
            }
        }

        if (resolution) {
            updates.resolution = resolution;
        }

        await issue.update(updates);
        res.json(issue);
    } catch (error) {
        res.status(500).json({ error: "Failed to update issue", message: error.message });
    }
});

/**
 * DELETE /api/issues/:id
 * Delete an issue (admin only)
 */
router.delete("/:id", requirePermission('admin'), async (req, res) => {
    try {
        const issue = await db.Issue.findByPk(req.params.id);
        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        await issue.destroy();
        res.json({ success: true, message: "Issue deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete issue", message: error.message });
    }
});

/**
 * POST /api/issues/:id/retry
 * Retry a download issue
 * Protected: Requires admin or manage_requests
 */
router.post("/:id/retry", (req, res, next) => {
    if (req.user.permissions.includes("admin") || req.user.permissions.includes("manage_requests")) return next();
    res.status(403).json({ error: "Forbidden: Insufficient permissions" });
}, async (req, res) => {
    try {
        const issue = await db.Issue.findByPk(req.params.id);
        if (!issue) {
            return res.status(404).json({ error: "Issue not found" });
        }

        if (issue.type !== 'download_failed') {
            return res.status(400).json({ error: "Cannot retry non-download issues" });
        }

        // Import manualRetry dynamically to avoid circular deps
        try {
            const { manualRetry } = await import("../services/downloadTracker.js");
            if (!manualRetry) throw new Error("manualRetry function not found");
        } catch (e) {
            console.error("Failed to load downloadTracker:", e);
            return res.status(500).json({ error: "Internal error: Retry service unavailable" });
        }

        // Reset issue status
        await issue.update({
            status: 'open',
            retryAttempts: 0,
            lastRetryAt: new Date(),
        });

        // If we have album ID, trigger search
        if (issue.albumId) {
            const { lidarrRequest } = await import("../services/api.js");
            await lidarrRequest('/command', 'POST', {
                name: 'AlbumSearch',
                albumIds: [issue.albumId]
            });
        }

        res.json({ success: true, message: "Retry triggered" });
    } catch (error) {
        res.status(500).json({ error: "Failed to retry", message: error.message });
    }
});

/**
 * POST /api/issues/bulk
 * Bulk update issues (resolve multiple, etc.)
 */
router.post("/bulk", requirePermission('admin'), async (req, res) => {
    try {
        const { ids, action } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "No issue IDs provided" });
        }

        let updates = {};
        let result;

        switch (action) {
            case 'resolve':
                updates = {
                    status: 'resolved',
                    resolvedAt: new Date(),
                    resolvedBy: req.user?.username || 'system'
                };
                break;
            case 'ignore':
                updates = { status: 'ignored' };
                break;
            case 'reopen':
                updates = {
                    status: 'open',
                    resolvedAt: null,
                    resolvedBy: null
                };
                break;
            case 'delete':
                const deletedCount = await db.Issue.destroy({ where: { id: ids } });
                return res.json({ success: true, affected: deletedCount });
            default:
                return res.status(400).json({ error: "Invalid action" });
        }

        const [affected] = await db.Issue.update(updates, {
            where: { id: ids }
        });

        res.json({ success: true, affected });
    } catch (error) {
        res.status(500).json({ error: "Failed to bulk update", message: error.message });
    }
});

export default router;
