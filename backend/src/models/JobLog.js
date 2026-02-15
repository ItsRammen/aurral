import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const JobLog = sequelize.define('JobLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('running', 'completed', 'failed'),
        defaultValue: 'running'
    },
    startedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    durationMs: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    error: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    indexes: [
        {
            fields: ['name']
        },
        {
            fields: ['startedAt']
        }
    ]
});

export default JobLog;
