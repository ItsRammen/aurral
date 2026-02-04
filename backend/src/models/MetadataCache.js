import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const MetadataCache = sequelize.define('MetadataCache', {
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        comment: "Unique cache key, e.g., 'artist:mbid-123' or 'similar:mbid-123'",
    },
    value: {
        type: DataTypes.TEXT, // Store JSON string
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('value');
            try {
                return rawValue ? JSON.parse(rawValue) : null;
            } catch (e) {
                return rawValue; // Fallback if not valid JSON
            }
        },
        set(val) {
            this.setDataValue('value', JSON.stringify(val));
        }
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    tableName: 'metadata_cache',
    timestamps: true // adds createdAt/updatedAt
});

export default MetadataCache;
