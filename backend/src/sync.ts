import * as Router from '@koa/router';

import taskwarrior from './taskwarrior';

const router = new Router();

router.post('/', async ctx => {
	const msg = taskwarrior.executeCommand('sync');
	console.log(msg);
	ctx.status = 200;
});

export default router;
