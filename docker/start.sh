#!/bin/sh

export NODE_ENV=production

PORT="${PORT:-80}"
BASE_PATH="${ROUTER_BASE_PATH:-/}"
# Ensure leading slash and remove trailing slash for location match (unless root /)
case "$BASE_PATH" in
	/*) ;;
	*) BASE_PATH="/$BASE_PATH" ;;
esac
BASE_PATH_CLEAN=$(echo "$BASE_PATH" | sed 's:/*$::')
[ -z "$BASE_PATH_CLEAN" ] && BASE_PATH_CLEAN="/"

mkdir -p /run/nginx
touch /src/backend/default.theme /default.theme /root/default.theme

# Generate nginx server config
if [ "$BASE_PATH_CLEAN" = "/" ]; then
cat <<EOF > /etc/nginx/conf.d/default.conf
server {
	listen ${PORT};
	listen [::]:${PORT};

	location / {
		root /static/;
		try_files \$uri \$uri/ /index.html;
	}

	location /api/ {
		proxy_pass http://localhost:3000/;
		proxy_set_header Host \$host;
		proxy_set_header X-Forwarded-For \$remote_addr;
	}
}
EOF
else
cat <<EOF > /etc/nginx/conf.d/default.conf
server {
	listen ${PORT};
	listen [::]:${PORT};

	location ${BASE_PATH_CLEAN}/ {
		alias /static/;
		try_files \$uri \$uri/ ${BASE_PATH_CLEAN}/index.html;
	}

	location ${BASE_PATH_CLEAN}/api/ {
		proxy_pass http://localhost:3000/;
		proxy_set_header Host \$host;
		proxy_set_header X-Forwarded-For \$remote_addr;
	}

	location /api/ {
		proxy_pass http://localhost:3000/;
		proxy_set_header Host \$host;
		proxy_set_header X-Forwarded-For \$remote_addr;
	}
}
EOF
fi

cd /src/backend
npm start &
nginx -g 'daemon off;'

