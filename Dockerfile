FROM alpine:3.20

RUN apk --no-cache add nodejs npm nginx python3 build-base bash \
 && apk --no-cache add --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community task3 \
 && (apk --no-cache add timewarrior || apk --no-cache add --repository=https://dl-cdn.alpinelinux.org/alpine/edge/testing timewarrior || true)

COPY ./frontend /src/frontend
COPY ./backend /src/backend
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/server.conf /etc/nginx/conf.d/default.conf
COPY ./docker/start.sh /start.sh

ENV TASKRC="/.taskrc"
ENV TASKDATA="/.task"

# Fix npm build
ENV NODE_OPTIONS="--openssl-legacy-provider"

# Frontend
RUN cd /src/frontend && npm install \
	&& npm run build && npm run export \
	&& cp -r /src/frontend/dist /static \
	&& rm -r /src/frontend

# Backend
RUN cd /src/backend && npm install \
	&& npm run build \
	&& npm prune --production \
	&& rm -r /src/backend/src

EXPOSE 80

# Taskwarrior data volume
VOLUME [ "/.task", "/.taskrc" ]

CMD ["/start.sh"]
