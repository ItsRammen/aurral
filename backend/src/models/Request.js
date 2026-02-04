import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Request = sequelize.define('Request', {
    uniqueId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    mbid: {
        type: DataTypes.STRING,
        allowNull: false
        // Removed unique constraint here if users can request same artist multiple times? 
        // Logic says one request per artist usually, but old db might have dupes.
    },
    artistName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending' // pending, monitored, processed, denied
    },
    requestedBy: {
        type: DataTypes.STRING, // Username
        allowNull: true
    },
    requestedByUserId: {
        type: DataTypes.STRING, // User ID (UUID)
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    foreignArtistId: { // Lidarr ID
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tags: {
        type: DataTypes.JSON, // For genre stats
        defaultValue: []
    },
    genres: {
        type: DataTypes.JSON, // For genre stats
        defaultValue: []
    },
    requestData: {
        type: DataTypes.JSON, // Stores the original request payload (quality profile, path, etc)
        allowNull: true
    }
});

export default Request;
