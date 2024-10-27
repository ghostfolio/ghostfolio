#!/usr/bin/env bash

PUID=${PUID:-1000}
PGID=${PGID:-1000}

groupmod -o -g "$PGID" node
usermod -o -u "$PUID" node

find /config \! \( -uid $(id -u node) -gid $(id -g node) \) -print0 | xargs -0r chown node:node

echo "Running Ghostfolio using using user node (uid=$(id -u node)) and group node (gid=$(id -g node))"
su node -g node -c "/ghostfolio/entrypoint.sh"
