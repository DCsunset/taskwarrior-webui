#!/bin/sh

export NODE_ENV=production

mkdir -p /run/nginx
touch /src/backend/default.theme /default.theme /root/default.theme
cd /src/backend
npm start &
nginx -g 'daemon off;'
