import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true // Null for OIDC users
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    avatar: {
        type: DataTypes.TEXT('long'), // For base64 strings
        allowNull: true
    },
    authType: {
        type: DataTypes.STRING,
        defaultValue: 'local' // 'local' or 'oidc'
    },
    permissions: {
        type: DataTypes.JSON,
        defaultValue: ["request"]
    },
    // Navidrome integration fields
    navidromeId: DataTypes.STRING,
    navidromeUsername: DataTypes.STRING,
    navidromeToken: DataTypes.STRING, // User token
    navidromeUserSalt: DataTypes.STRING, // User salt
    navidromeTokenExpires: DataTypes.DATE,
    navidromeConfig: { // Admin/Server config for this user (if admin)
        type: DataTypes.JSON,
        allowNull: true
    }
});

export default User;
