#!/bin/sh

[ ! -z "${USER_UID}" ] && usermod -u ${USER_UID} node || echo "No USER_UID specified, leaving 1000"
[ ! -z "${USER_GID}" ] && groupmod -og ${USER_GID} node || echo "No USER_GID specified, leaving 1000"

# for fly.io. Volume 'data' must exist and be mounted to /data
export TRILIUM_DATA_DIR=/data

chown -R node:node /home/node
exec su -c "node ./dist/main.js" node