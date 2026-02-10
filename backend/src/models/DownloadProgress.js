import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const DownloadProgress = sequelize.define('DownloadProgress', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    queueItemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Lidarr queue item ID'
    },
    albumId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Lidarr album ID'
    },
    artistId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Lidarr artist ID'
    },
    artistName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    albumTitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    releaseTitle: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Name of the release being downloaded'
    },
    progress: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        comment: 'Download progress 0-100'
    },
    size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Total size in bytes'
    },
    sizeleft: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Remaining size in bytes'
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'downloading',
        comment: 'downloading, importing, stuck, retrying, completed, failed'
    },
    downloadClient: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Name of the download client'
    },
    indexer: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Indexer used for this release'
    },
    retryCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    firstSeenAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    lastProgressAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Last time progress changed'
    },
    stuckSince: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the download was first detected as stuck (null if progressing)'
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        { fields: ['queueItemId'] },
        { fields: ['status'] },
        { fields: ['albumId'] }
    ]
});

export default DownloadProgress;
