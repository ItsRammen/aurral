import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Like = sequelize.define('Like', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING, // Should link to User.id but defined loosely for migration ease
        allowNull: true
    },
    mbid: {
        type: DataTypes.STRING,
        allowNull: false
    },
    artistName: DataTypes.STRING,
    artistImage: DataTypes.STRING
});

export default Like;
