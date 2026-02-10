import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Issue model - tracks problems that need user attention
 * Similar to Overseerr's issues system
 */
const Issue = sequelize.define('Issue', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'download_failed, import_failed, stuck_download, quality_issue'
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'open',
        comment: 'open, resolved, ignored'
    },
    severity: {
        type: DataTypes.STRING,
        defaultValue: 'warning',
        comment: 'info, warning, error'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Related entity info
    artistId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    artistName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    artistMbid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    albumId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    albumTitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Tracking info
    retryAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    maxRetries: {
        type: DataTypes.INTEGER,
        defaultValue: 3
    },
    lastRetryAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Resolution info
    resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resolvedBy: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Username who resolved the issue'
    },
    resolution: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'How was the issue resolved'
    },
    // Metadata
    metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Additional context (indexer, release name, error details)'
    }
}, {
    indexes: [
        { fields: ['status'] },
        { fields: ['type'] },
        { fields: ['artistId'] },
        { fields: ['albumId'] }
    ]
});

export default Issue;
