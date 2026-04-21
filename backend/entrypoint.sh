#!/bin/sh
chown -R appuser:appuser /app/config

if [ -S /var/run/docker.sock ]; then
    DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
    DOCKER_GROUP=$(getent group "$DOCKER_GID" 2>/dev/null | cut -d: -f1)
    if [ -z "$DOCKER_GROUP" ]; then
        groupadd --gid "$DOCKER_GID" docker-socket
        DOCKER_GROUP=docker-socket
    fi
    usermod -aG "$DOCKER_GROUP" appuser
fi

exec gosu appuser uvicorn main:app --host 0.0.0.0 --port 8001
