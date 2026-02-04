import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Play = sequelize.define('Play', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    trackId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    trackName: DataTypes.STRING,
    artistName: DataTypes.STRING,
    albumName: DataTypes.STRING,
    duration: DataTypes.INTEGER,
    playedAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    source: {
        type: DataTypes.STRING,
        defaultValue: 'navidrome'
    }
}, {
    indexes: [
        {
            fields: ['userId']
        },
        {
            fields: ['playedAt']
        }
    ]
});

export default Play;
