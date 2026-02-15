import { db } from "../config/db.js";

/**
 * Executes a job with logging.
 * @param {string} jobName - The unique name of the job
 * @param {Function} jobFn - The async function to execute
 * @returns {Promise<any>} - The result of the job function
 */
export const runJob = async (jobName, jobFn) => {
    console.log(`[Job: ${jobName}] Starting...`);

    // Create log entry
    let log;
    try {
        log = await db.JobLog.create({
            name: jobName,
            status: 'running',
            startedAt: new Date()
        });
    } catch (e) {
        console.error(`[Job: ${jobName}] Failed to create log entry:`, e);
        // Proceed even if logging fails, but it's not ideal
    }

    const start = Date.now();

    try {
        const result = await jobFn();

        const duration = Date.now() - start;
        console.log(`[Job: ${jobName}] Completed in ${duration}ms`);

        if (log) {
            await log.update({
                status: 'completed',
                completedAt: new Date(),
                durationMs: duration
            });
        }
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        console.error(`[Job: ${jobName}] Failed after ${duration}ms:`, error);

        if (log) {
            await log.update({
                status: 'failed',
                completedAt: new Date(),
                durationMs: duration,
                error: error.message || String(error)
            });
        }
        throw error;
    }
};

/**
 * Gets the latest status for a list of jobs.
 * @param {string[]} jobNames - List of job names to query
 * @returns {Promise<Object[]>} - Array of job status objects
 */
export const getLatestJobStatus = async (jobNames) => {
    // This is inefficient loop but simpler for now given few jobs. 
    // Optimization: Use a single query with window function or group by max(id).
    // SQLite doesn't support complex window functions easily in all versions, 
    // so we'll do separate queries or a group by.

    // Group by approach in Sequelize is tricky for "latest row per group", 
    // often easier to just fetch latest individually if list is small (< 10).
    // Let's assume list is small.

    const statuses = [];
    for (const name of jobNames) {
        const latest = await db.JobLog.findOne({
            where: { name },
            order: [['startedAt', 'DESC']]
        });

        if (latest) {
            statuses.push(latest);
        } else {
            statuses.push({ name, status: 'idle', startedAt: null, completedAt: null });
        }
    }
    return statuses;
};
