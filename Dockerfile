FROM alpine:latest

# Debug
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories

RUN apk --no-cache add nodejs npm nginx task python3 build-base

COPY ./frontend /src/frontend
COPY ./backend /src/backend
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/server.conf /etc/nginx/conf.d/default.conf
COPY ./docker/start.sh /start.sh

ENV TASKRC="/.taskrc"
ENV TASKDATA="/.task"

# Frontend
RUN cd /src/frontend && npm install --legacy-peer-deps \
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
