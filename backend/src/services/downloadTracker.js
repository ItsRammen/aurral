/**
 * Download Progress Tracker Service
 * Monitors Lidarr download queue, detects stuck downloads, and auto-retries
 */

import { db } from "../config/db.js";
import { lidarrRequest, loadSettings } from "./api.js";

// In-memory cache for quick progress comparison
let lastProgressSnapshot = new Map();
let isTrackerRunning = false;
let trackerInterval = null;

// Default settings (can be overridden by AppConfig)
const DEFAULT_SETTINGS = {
    enabled: true,
    pollIntervalSeconds: 30,
    stuckThresholdMinutes: 15,
    maxRetries: 3,
    autoRetry: true,
};

/**
 * Get tracker settings from AppConfig or use defaults
 */
async function getTrackerSettings() {
    try {
        const config = await db.AppConfig.findByPk('main');
        const settings = config?.downloadTracker || {};
        return { ...DEFAULT_SETTINGS, ...settings };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

/**
 * Fetch current download queue from Lidarr
 */
async function fetchQueue() {
    try {
        const response = await lidarrRequest('/queue?includeUnknownArtistItems=true&includeArtist=true&includeAlbum=true');
        return response.records || [];
    } catch (error) {
        console.error('[DownloadTracker] Failed to fetch queue:', error.message);
        return [];
    }
}

/**
 * Calculate progress percentage from Lidarr queue item
 */
function calculateProgress(item) {
    if (!item.size || item.size === 0) return 0;
    const downloaded = item.size - (item.sizeleft || 0);
    return Math.round((downloaded / item.size) * 100 * 10) / 10; // 1 decimal place
}

/**
 * Detect if a download is stuck based on progress history
 */
function isStuck(item, lastSnapshot, stuckThresholdMs) {
    const lastItem = lastSnapshot.get(item.id);
    if (!lastItem) return false;

    const currentProgress = calculateProgress(item);
    const lastProgress = lastItem.progress;
    const timeSinceLastProgress = Date.now() - lastItem.lastProgressTime;

    // If progress hasn't changed and threshold exceeded, it's stuck
    if (currentProgress === lastProgress && timeSinceLastProgress >= stuckThresholdMs) {
        return true;
    }

    return false;
}

/**
 * Cancel a stuck download and blacklist the release
 */
async function cancelDownload(queueItemId, blacklist = true) {
    try {
        await lidarrRequest(`/queue/${queueItemId}?removeFromClient=true&blacklist=${blacklist}&skipRedownload=false`, 'DELETE');
        console.log(`[DownloadTracker] Cancelled queue item ${queueItemId} (blacklist: ${blacklist})`);
        return true;
    } catch (error) {
        console.error(`[DownloadTracker] Failed to cancel queue item ${queueItemId}:`, error.message);
        return false;
    }
}

/**
 * Trigger a new search for an album
 */
async function triggerAlbumSearch(albumId) {
    try {
        await lidarrRequest('/command', 'POST', {
            name: 'AlbumSearch',
            albumIds: [albumId]
        });
        console.log(`[DownloadTracker] Triggered search for album ${albumId}`);
        return true;
    } catch (error) {
        console.error(`[DownloadTracker] Failed to trigger search for album ${albumId}:`, error.message);
        return false;
    }
}

/**
 * Create an issue for a failed download
 */
async function createIssue(item, retryCount) {
    try {
        await db.Issue.create({
            type: 'download_failed',
            severity: 'error',
            title: `Download failed: ${item.album?.title || 'Unknown Album'}`,
            message: `Failed to download after ${retryCount} attempts. The release may not be available from any indexer.`,
            artistId: item.artist?.id,
            artistName: item.artist?.artistName,
            artistMbid: item.artist?.foreignArtistId,
            albumId: item.album?.id,
            albumTitle: item.album?.title,
            retryAttempts: retryCount,
            maxRetries: retryCount,
            metadata: {
                releaseTitle: item.title,
                indexer: item.indexer,
                downloadClient: item.downloadClient,
                errorMessage: item.statusMessages?.join(', ') || null,
            }
        });
        console.log(`[DownloadTracker] Created issue for failed download: ${item.album?.title}`);
    } catch (error) {
        console.error('[DownloadTracker] Failed to create issue:', error.message);
    }
}

/**
 * Update or create download progress record
 */
async function updateProgressRecord(item, status) {
    try {
        const progress = calculateProgress(item);

        const [record, created] = await db.DownloadProgress.findOrCreate({
            where: { queueItemId: item.id },
            defaults: {
                queueItemId: item.id,
                albumId: item.album?.id,
                artistId: item.artist?.id,
                artistName: item.artist?.artistName,
                albumTitle: item.album?.title,
                releaseTitle: item.title,
                progress,
                size: item.size,
                sizeleft: item.sizeleft,
                status,
                downloadClient: item.downloadClient,
                indexer: item.indexer,
                errorMessage: item.statusMessages?.join(', ') || null,
            }
        });

        if (!created) {
            // Update existing record
            const updates = {
                progress,
                sizeleft: item.sizeleft,
                status,
                errorMessage: item.statusMessages?.join(', ') || null,
            };

            // Update lastProgressAt if progress changed
            if (record.progress !== progress) {
                updates.lastProgressAt = new Date();
                updates.stuckSince = null; // Reset stuck timer
            }

            // Mark stuckSince if status is stuck and not already set
            if (status === 'stuck' && !record.stuckSince) {
                updates.stuckSince = new Date();
            }

            // Mark completed
            if (status === 'completed') {
                updates.completedAt = new Date();
            }

            await record.update(updates);
        }

        return record;
    } catch (error) {
        console.error('[DownloadTracker] Failed to update progress record:', error.message);
        return null;
    }
}

/**
 * Handle a stuck download - cancel and retry if under max retries
 */
async function handleStuckDownload(item, settings) {
    const record = await db.DownloadProgress.findOne({
        where: { queueItemId: item.id }
    });

    const retryCount = record?.retryCount || 0;

    if (retryCount >= settings.maxRetries) {
        // Max retries exceeded - create an issue
        console.log(`[DownloadTracker] Max retries (${settings.maxRetries}) exceeded for ${item.album?.title}`);
        await updateProgressRecord(item, 'failed');
        await createIssue(item, retryCount);

        // Cancel without triggering new search
        await cancelDownload(item.id, true);
        return;
    }

    if (settings.autoRetry) {
        console.log(`[DownloadTracker] Retrying stuck download (attempt ${retryCount + 1}/${settings.maxRetries}): ${item.album?.title}`);

        // Update retry count
        if (record) {
            await record.update({
                retryCount: retryCount + 1,
                status: 'retrying'
            });
        }

        // Cancel current download (blacklist this release)
        const cancelled = await cancelDownload(item.id, true);

        if (cancelled && item.album?.id) {
            // Trigger new search for alternative release
            await triggerAlbumSearch(item.album.id);
        }
    }
}

/**
 * Main polling function - checks queue and handles stuck downloads
 */
async function pollQueue() {
    if (isTrackerRunning) {
        console.log('[DownloadTracker] Previous poll still running, skipping...');
        return;
    }

    isTrackerRunning = true;

    try {
        const settings = await getTrackerSettings();
        if (!settings.enabled) {
            isTrackerRunning = false;
            return;
        }

        const queueItems = await fetchQueue();
        const stuckThresholdMs = settings.stuckThresholdMinutes * 60 * 1000;
        const now = Date.now();

        for (const item of queueItems) {
            const progress = calculateProgress(item);
            const currentSnapshot = lastProgressSnapshot.get(item.id);

            // Determine status
            let status = 'downloading';
            if (item.status === 'completed' || item.trackedDownloadStatus === 'ok') {
                status = 'importing';
            }

            // Check if stuck
            const stuck = isStuck(item, lastProgressSnapshot, stuckThresholdMs);
            if (stuck) {
                status = 'stuck';
                await handleStuckDownload(item, settings);
            } else {
                // Update progress record
                await updateProgressRecord(item, status);
            }

            // Update snapshot
            lastProgressSnapshot.set(item.id, {
                progress,
                lastProgressTime: currentSnapshot?.progress === progress
                    ? (currentSnapshot?.lastProgressTime || now)
                    : now,
                status,
            });
        }

        // Clean up old snapshots for items no longer in queue
        const currentIds = new Set(queueItems.map(item => item.id));
        for (const [id] of lastProgressSnapshot) {
            if (!currentIds.has(id)) {
                // Mark as completed in DB
                const record = await db.DownloadProgress.findOne({ where: { queueItemId: id } });
                if (record && record.status !== 'failed' && record.status !== 'completed') {
                    await record.update({ status: 'completed', completedAt: new Date() });
                }
                lastProgressSnapshot.delete(id);
            }
        }

    } catch (error) {
        console.error('[DownloadTracker] Poll error:', error.message);
    } finally {
        isTrackerRunning = false;
    }
}

/**
 * Get current queue progress for API
 */
export async function getQueueProgress() {
    const queueItems = await fetchQueue();

    const items = queueItems.map(item => ({
        id: item.id,
        artistName: item.artist?.artistName || 'Unknown Artist',
        albumTitle: item.album?.title || 'Unknown Album',
        releaseTitle: item.title,
        progress: calculateProgress(item),
        size: item.size,
        sizeleft: item.sizeleft,
        status: item.status,
        trackedDownloadStatus: item.trackedDownloadStatus,
        eta: item.timeleft,
        downloadClient: item.downloadClient,
        indexer: item.indexer,
        errorMessages: item.statusMessages || [],
    }));

    // Get retry counts from DB
    const queueIds = items.map(i => i.id);
    const records = await db.DownloadProgress.findAll({
        where: { queueItemId: queueIds }
    });
    const recordMap = new Map(records.map(r => [r.queueItemId, r]));

    // Enrich items with tracking data
    const enrichedItems = items.map(item => {
        const record = recordMap.get(item.id);
        return {
            ...item,
            retryCount: record?.retryCount || 0,
            stuck: record?.status === 'stuck' || record?.status === 'retrying',
            stuckSince: record?.stuckSince,
        };
    });

    // Get issue count
    const openIssues = await db.Issue.count({
        where: { status: 'open', type: 'download_failed' }
    });

    return {
        items: enrichedItems,
        summary: {
            total: items.length,
            downloading: items.filter(i => i.status === 'downloading').length,
            importing: items.filter(i => i.status === 'completed').length,
            stuck: enrichedItems.filter(i => i.stuck).length,
            openIssues,
        }
    };
}

/**
 * Start the download tracker
 */
export async function startDownloadTracker() {
    const settings = await getTrackerSettings();

    if (!settings.enabled) {
        console.log('[DownloadTracker] Disabled in settings, not starting.');
        return;
    }

    const intervalMs = settings.pollIntervalSeconds * 1000;
    console.log(`[DownloadTracker] Starting with ${settings.pollIntervalSeconds}s poll interval, ${settings.stuckThresholdMinutes}min stuck threshold`);

    // Initial poll
    setTimeout(pollQueue, 5000);

    // Regular polling
    trackerInterval = setInterval(pollQueue, intervalMs);
}

/**
 * Stop the download tracker
 */
export function stopDownloadTracker() {
    if (trackerInterval) {
        clearInterval(trackerInterval);
        trackerInterval = null;
    }
    console.log('[DownloadTracker] Stopped');
}

/**
 * Restart tracker (e.g., after settings change)
 */
export async function restartDownloadTracker() {
    stopDownloadTracker();
    await startDownloadTracker();
}

/**
 * Manually retry a stuck download
 */
export async function manualRetry(queueItemId) {
    try {
        // Get queue item from Lidarr
        const queue = await fetchQueue();
        const item = queue.find(q => q.id === queueItemId);

        if (!item) {
            return { success: false, message: 'Queue item not found' };
        }

        // Reset retry count and retry
        const record = await db.DownloadProgress.findOne({
            where: { queueItemId }
        });
        if (record) {
            await record.update({ retryCount: 0, status: 'retrying' });
        }

        const cancelled = await cancelDownload(queueItemId, true);
        if (cancelled && item.album?.id) {
            await triggerAlbumSearch(item.album.id);
            return { success: true, message: 'Retry triggered' };
        }

        return { success: false, message: 'Failed to cancel download' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}
