#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
    mkdir -p /app/data
    
    chown -R nodejs:nodejs /app/data
    
    exec su-exec nodejs:nodejs "$@"
fi

exec "$@"
