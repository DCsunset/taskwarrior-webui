# Taskwarrior-webui

[![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/dcsunset/taskwarrior-webui)](https://hub.docker.com/r/dcsunset/taskwarrior-webui)
[![Docker Image Size](https://badgen.net/docker/size/dcsunset/taskwarrior-webui)](https://hub.docker.com/r/dcsunset/taskwarrior-webui)

Responsive Web UI for Taskwarrior based on Vue.js and Koa.js.

## Screenshots

![Screenshot 1](./screenshots/Screenshot1.png)

![Screenshot 2](./screenshots/Screenshot2.png)

## Features

* Responsive layouts
* Material Design UI
* PWA support
* Easy to deploy (using Docker)
* Support for multiple types of tasks
* Support for light and dark themes
* Sync with a taskserver


## Deployment

### Using docker (recommended)

First pull the docker image:

```
docker pull dcsunset/taskwarrior-webui
```

Then run it with the command:

```
docker run -d -p 8080:80 --name taskwarrior-webui \
	-v $HOME/.taskrc:/.taskrc -v $HOME/.task:/.task \
	dcsunset/taskwarrior-webui
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


## FAQ

### Sync with a taskserver

This Web UI supports auto sync with a taskd server
by calling the `task sync` command periodically.
In order to use this function,
first you need to follow the [instructions](https://taskwarrior.org/docs/taskserver/setup.html)
to configure both the taskserver and client manually until the `task sync` can be executed successfully.
Then remember to map the client configurations (`.taskrc` and `.task`) into the container.


## License

GPL-3.0 License
