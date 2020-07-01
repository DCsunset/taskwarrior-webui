import * as Koa from 'koa';
import * as Router from '@koa/router';
import * as bodyParser from 'koa-bodyparser';
import tasksRouter from './tasks';

const app = new Koa();

app.use(bodyParser());

const router = new Router();
router.use(tasksRouter.routes());

app.use(router.routes());
app.use(router.allowedMethods());

const prod = process.env.NODE_ENV === 'production';
const addr = prod ? '0.0.0.0' : 'localhost';
app.listen(3000, addr);

console.log(`Server listening on http://${addr}:3000`);
