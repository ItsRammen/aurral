#!/bin/sh
set -e

# If running as root, fix permissions and drop privileges
if [ "$(id -u)" = "0" ]; then
    # Ensure the data directory exists
    mkdir -p /app/data
    
    # Fix permissions for the data directory
    chown -R nodejs:nodejs /app/data
    
    # Drop privileges and execute the command
    exec su-exec nodejs:nodejs "$@"
fi

# If not running as root, just execute the command
exec "$@"
