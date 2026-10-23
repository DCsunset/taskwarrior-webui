import * as Router from '@koa/router';

import { Task } from "taskwarrior-lib";
import { getTaskwarriorFromCtx, getProfile } from './profiles';

import { execSync, execFileSync } from 'child_process';
import { parse } from 'shell-quote';

const router = new Router();

router.get('/timew', async ctx => {
	try {
		const output = execSync('timew export', { encoding: 'utf-8' });
		const intervals = JSON.parse(output);
		const durationMap: { [key: string]: number } = {};

		for (const int of intervals) {
			const start = new Date(int.start).getTime();
			const end = int.end ? new Date(int.end).getTime() : Date.now();
			const durationSec = Math.floor((end - start) / 1000);

			for (const tag of (int.tags || [])) {
				durationMap[tag] = (durationMap[tag] || 0) + durationSec;
			}
		}

		ctx.body = durationMap;
	} catch (err) {
		ctx.body = {};
	}
});

router.get('/timew-status', async ctx => {
	try {
		execSync('timew --version');
		ctx.body = { present: true };
	} catch (e) {
		ctx.body = { present: false };
	}
});

router.get('/undo/preview', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const output = tw.executeCommand('undo');
	ctx.body = { report: output };
});

router.post('/undo', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const msg = tw.executeCommand('rc.confirmation:off undo');
	console.log(msg);
	ctx.status = 200;
});

router.get('/active', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const activeTasks = tw.load('+ACTIVE');
	ctx.body = activeTasks.length > 0 ? activeTasks[0] : null;
});

router.post('/:uuid/start', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const uuid = ctx.params.uuid;
	try {
		const activeTasks = tw.load('+ACTIVE');
		if (activeTasks && activeTasks.length > 0) {
			tw.executeCommand('+ACTIVE stop');
		}
	} catch (e) {
		console.warn('Failed to stop active tasks:', e);
	}
	const { assignee } = (ctx.request as any).body || {};
	const assigneeMod = assignee ? ` assignee:${assignee}` : '';
	const msg = tw.executeCommand("'" + uuid + "'" + ' start' + assigneeMod);
	console.log(msg);
	ctx.status = 200;
});

router.post('/:uuid/stop', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const uuid = ctx.params.uuid;
	const msg = tw.executeCommand("'" + uuid + "'" + ' stop');
	console.log(msg);
	ctx.status = 200;
});

router.post('/:uuid/annotate', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const uuid = ctx.params.uuid;
	const body = ctx.request.body as { annotation: string };
	const msg = tw.executeCommand("'" + uuid + "' annotate " + body.annotation);
	console.log(msg);
	ctx.status = 200;
});

router.post('/:uuid/modify', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const uuid = ctx.params.uuid;
	const body = ctx.request.body as { command: string };
	const msg = tw.executeCommand("'" + uuid + "' modify " + body.command);
	console.log(msg);
	ctx.status = 200;
});

router.get('/', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const tasks = tw.load();
	ctx.body = tasks;
});

router.put('/', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const body = ctx.request.body as { tasks: Task[] };
	const msg = tw.update(body.tasks);
	console.log(msg);
	ctx.status = 200;
});

router.delete('/', async ctx => {
	const tw = getTaskwarriorFromCtx(ctx);
	const tasks = ctx.query.tasks as string[];
	const msg = tw.del(tasks.map(t => ({ uuid: t })));
	console.log(msg);
	ctx.status = 200;
});

router.post('/command', async ctx => {
	const body = ctx.request.body as { command: string; assignee?: string; project?: string };
	const { command, assignee, project } = body;
	
	if (!command) {
		ctx.status = 400;
		ctx.body = { error: 'Command is required' };
		return;
	}

	try {
		const args = parse(command);
		const stringArgs = args.filter((a): a is string => typeof a === 'string');
		
		if (stringArgs.length === 0) {
			ctx.status = 400;
			ctx.body = { error: 'Invalid command' };
			return;
		}

		let executable = 'task';
		if (stringArgs[0] === 'timew' || stringArgs[0] === 'task') {
			executable = stringArgs[0];
			stringArgs.shift();
		}
		
		const profileHeader = (ctx.headers['x-taskwarrior-profile'] || ctx.query.profile) as string | undefined;
		const contextHeader = (ctx.headers['x-taskwarrior-context'] || ctx.query.context) as string | undefined;
		const profile = getProfile(profileHeader);

		if (executable === 'task') {
			const isCreation = stringArgs.includes('add') || stringArgs.includes('log');
			if (assignee) {
				stringArgs.push(`assignee:${assignee}`);
			}
			if (isCreation && project) {
				stringArgs.push(`project:${project}`);
			}
			if (contextHeader) {
				stringArgs.unshift(`rc.context=${contextHeader}`);
			}
			stringArgs.unshift('rc.confirmation=off', 'rc.bulk=0', 'rc._forcecolor=off', 'rc.defaultwidth=0');
		} else if (executable === 'timew') {
			stringArgs.push(':yes');
		}

		// Support profile paths in env for command execution
		const env = { ...process.env };
		if (profile.rcPath) env.TASKRC = profile.rcPath;
		if (profile.dataPath) env.TASKDATA = profile.dataPath;
		
		// Run command
		const output = execFileSync(executable, stringArgs, { encoding: 'utf-8', env });
		ctx.status = 200;
		ctx.body = { output };
	} catch (error: any) {
		ctx.status = 500;
		ctx.body = { 
			error: error.message || String(error), 
			stdout: error.stdout?.toString(),
			stderr: error.stderr?.toString()
		};
	}
});

export default router;
