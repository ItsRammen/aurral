import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// We'll use a single row for configuration to mimic the previous structure
// or a Key-Value store. A single row with JSON columns is easiest for migration
// of the nested 'settings' object in db.json.
const AppConfig = sequelize.define('AppConfig', {
    key: { // 'main'
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: 'main'
    },
    lidarrUrl: DataTypes.STRING,
    lidarrApiKey: DataTypes.STRING,
    lastfmApiKey: DataTypes.STRING,
    contactEmail: DataTypes.STRING,

    // Feature flags & preferences
    monitored: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    searchForMissingAlbums: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    albumFolders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    qualityProfileId: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    metadataProfileId: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    rootFolderPath: {
        type: DataTypes.STRING,
        defaultValue: '/music'
    },

    // Auth & App
    appName: {
        type: DataTypes.STRING,
        defaultValue: 'Aurral'
    },
    appUrl: DataTypes.STRING,
    defaultPermissions: {
        type: DataTypes.JSON,
        defaultValue: ["request"]
    },
    discoveryRefreshInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 24
    },

    // OIDC Configuration
    oidcEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    oidcProviderName: DataTypes.STRING,
    oidcClientId: DataTypes.STRING,
    oidcClientSecret: DataTypes.STRING,
    oidcIssuerUrl: DataTypes.STRING,
    oidcAuthorizationUrl: DataTypes.STRING,
    oidcTokenUrl: DataTypes.STRING,
    oidcUserInfoUrl: DataTypes.STRING,
    oidcLogoutUrl: DataTypes.STRING,
    oidcCallbackUrl: DataTypes.STRING,

    discoveryLastRun: {
        type: DataTypes.DATE,
        allowNull: true
    },
    discoveryData: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

export default AppConfig;
