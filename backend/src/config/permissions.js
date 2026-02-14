/**
 * Centralized Permission Constants
 * 
 * These constants should be used throughout the application to avoid hardcoded strings.
 */
export const PERMISSIONS = {
    ADMIN: 'admin',
    MANAGE_USERS: 'manage_users',
    MANAGE_REQUESTS: 'manage_requests',
    REQUEST: 'request',
    AUTO_APPROVE: 'auto_approve',
    READ_ONLY: 'read_only'
};

export const ROLES = {
    ADMIN: [PERMISSIONS.ADMIN],
    MODERATOR: [
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_REQUESTS,
        PERMISSIONS.REQUEST,
        PERMISSIONS.AUTO_APPROVE
    ],
    POWER_USER: [
        PERMISSIONS.REQUEST,
        PERMISSIONS.AUTO_APPROVE
    ],
    USER: [PERMISSIONS.REQUEST],
    GUEST: [] // Read-only is usually implicit or specific 'read_only' permission
};

export const DEFAULT_PERMISSIONS = [PERMISSIONS.REQUEST];
