#!/bin/sh
chown -R appuser:appuser /app/config
exec gosu appuser uvicorn main:app --host 0.0.0.0 --port 8001
