import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ImageCache = sequelize.define('ImageCache', {
    mbid: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    url: {
        type: DataTypes.STRING, // URL string or "NOT_FOUND"
        allowNull: true
    },
    data: {
        type: DataTypes.JSON, // Full image array if needed
        allowNull: true
    },
    localPath: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cachedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

export default ImageCache;
