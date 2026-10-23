import * as Router from '@koa/router';
import { getTaskwarriorFromCtx } from './profiles';

const router = new Router();

router.get('/', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	try {
		// task _context returns list of defined context names separated by newline
		const contextListOutput = tw.executeCommand('rc.confirmation=off _context');
		const contexts = contextListOutput
			.split('\n')
			.map(c => c.trim())
			.filter(Boolean)
			.filter(c => !c.startsWith('Configuration override'));

		// task _get rc.context returns the active context name if set
		let currentContext = 'none';
		try {
			const activeOutput = tw.executeCommand('rc.confirmation=off _get rc.context');
			const activeClean = activeOutput
				.split('\n')
				.map(c => c.trim())
				.filter(Boolean)
				.find(c => !c.startsWith('Configuration override'));
			if (activeClean) {
				currentContext = activeClean;
			}
		} catch (e) {
			// No active context
		}

		ctx.body = {
			contexts,
			currentContext
		};
	} catch (e: any) {
		ctx.status = 500;
		ctx.body = {
			error: e.message || String(e),
			contexts: [],
			currentContext: 'none'
		};
	}
});

router.post('/', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const body = ctx.request.body as { context?: string };
	const contextName = (body && body.context) ? body.context.trim() : 'none';

	try {
		let output: string;
		if (!contextName || contextName === 'none') {
			output = tw.executeCommand('rc.confirmation=off context none');
		} else {
			output = tw.executeCommand(`rc.confirmation=off context "${contextName}"`);
		}
		ctx.body = {
			success: true,
			output,
			currentContext: contextName
		};
	} catch (e: any) {
		ctx.status = 500;
		ctx.body = {
			error: e.message || String(e)
		};
	}
});

export default router;
