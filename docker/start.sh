#!/bin/sh
mkdir -p /run/nginx
cd /src/backend
npm start &
nginx -g 'daemon off;'
