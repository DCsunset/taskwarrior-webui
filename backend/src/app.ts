import * as Koa from 'koa';
import * as Router from '@koa/router';
import * as bodyParser from 'koa-bodyparser';
import * as logger from 'koa-logger';
import * as qs from 'koa-qs';

import tasksRouter from './tasks';
import syncRouter from './sync';
import queriesRouter from './queries';
import reportsRouter from './reports';
import { TaskError } from 'taskwarrior-lib';

const app = new Koa();

qs(app);
app.use(bodyParser());
app.use(logger());

app.use(async (ctx, next) => {
	try {
		await next();
	}
	catch (err) {
		if (err instanceof TaskError) {
			(err as any).expose = true;
			(err as any).status = 400;
		}
		throw err;
	}
});

import profilesRouter from './profiles';
import contextsRouter from './contexts';

const router = new Router();
router.use('/tasks', tasksRouter.routes());
router.use('/sync', syncRouter.routes());
router.use('/config/queries', queriesRouter.routes());
router.use('/config/profiles', profilesRouter.routes());
router.use('/config/contexts', contextsRouter.routes());
router.use('/reports', reportsRouter.routes());

app.use(router.routes());
app.use(router.allowedMethods());

const rawBasePath = process.env.ROUTER_BASE_PATH;
if (rawBasePath && rawBasePath !== '/') {
	const prefix = rawBasePath.startsWith('/') ? rawBasePath.replace(/\/+$/, '') : `/${rawBasePath.replace(/\/+$/, '')}`;
	const prefixedRouter = new Router({ prefix });
	prefixedRouter.use('/tasks', tasksRouter.routes());
	prefixedRouter.use('/sync', syncRouter.routes());
	prefixedRouter.use('/config/queries', queriesRouter.routes());
	prefixedRouter.use('/config/profiles', profilesRouter.routes());
	prefixedRouter.use('/config/contexts', contextsRouter.routes());
	prefixedRouter.use('/reports', reportsRouter.routes());
	app.use(prefixedRouter.routes());
	app.use(prefixedRouter.allowedMethods());
}

const prod = process.env.NODE_ENV === 'production';
const addr = prod ? '0.0.0.0' : 'localhost';
const port = parseInt(process.env.PORT || process.env.APP_PORT || '3000', 10);
app.listen(port, addr);

console.log(`Server listening on http://${addr}:${port}`);
