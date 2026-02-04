#!/bin/sh
set -e

# Default PUID/PGID if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Update permissions if running as root
if [ "$(id -u)" = "0" ]; then
    echo "Setting up permissions... PUID=$PUID, PGID=$PGID"
    
    # Create group if it doesn't exist, or modify nodejs group
    if getent group nodejs > /dev/null 2>&1; then
        groupmod -o -g "$PGID" nodejs
    else
        addgroup -g "$PGID" nodejs
    fi

    # Create user if it doesn't exist, or modify nodejs user
    if id -u nodejs > /dev/null 2>&1; then
        usermod -o -u "$PUID" -g nodejs nodejs
    else
        adduser -D -u "$PUID" -G nodejs nodejs
    fi

    # Ensure data directory exists and has correct permissions
    mkdir -p /app/data
    chown -R nodejs:nodejs /app/data
    chown -R nodejs:nodejs /app

    # Execute the command as the nodejs user
    exec su-exec nodejs:nodejs "$@"
fi

# If not root (e.g. running locally or specific user), just run
exec "$@"
