import * as Router from '@koa/router';

import { getTaskwarriorFromCtx } from './profiles';

const router = new Router();

router.post('/', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const msg = tw.executeCommand('sync');
	console.log(msg);
	ctx.status = 200;
});

export default router;

