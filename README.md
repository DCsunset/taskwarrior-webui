# Taskwarrior-webui

[![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/dcsunset/taskwarrior-webui)](https://hub.docker.com/r/dcsunset/taskwarrior-webui)

Responsive Web UI for Taskwarrior based on Vue.js and Koa.js.

## Features

* Responsive layouts
* Material Design UI
* PWA support
* Easy to deploy (using Docker)
* Support multiple types of tasks


## Deployment

### Using docker (recommended)

First pull the docker image:

```
docker pull dcsunset/taskwarrior-webui
```

Then run it with the command:

```
docker run -d -p 8080:80 -v $HOME/.taskrc:/.taskrc -v $HOME/.task:/.task dcsunset/taskwarrior-webui
```

### Manually deploy

First build the frontend:

```
cd frontend
npm install
npm run build
npm run export
```

Then build and start the backend:

```
cd backend
npm install
npm run build
npm start
```

Then install nginx or other web servers
to server frontend and proxy requests to backend
(you can refer to `nginx/nginx.conf`).


## Development

First start the server at backend:

```
cd backend
npm install
npm run dev
```

Then start the dev server at frontend:

```
cd frontend
npm install
npm run dev
```

Then the frontend will listen at port 8080.


## License

GPL-3.0 License
