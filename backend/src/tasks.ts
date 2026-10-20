import * as Router from '@koa/router';

import taskwarrior from './taskwarrior';
import { Task } from "taskwarrior-lib";

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
	const output = taskwarrior.executeCommand('undo');
	ctx.body = { report: output };
});

router.post('/undo', async ctx => {
	const msg = taskwarrior.executeCommand('rc.confirmation:off undo');
	console.log(msg);
	ctx.status = 200;
});

router.get('/active', async ctx => {
	const activeTasks = taskwarrior.load('+ACTIVE');
	ctx.body = activeTasks.length > 0 ? activeTasks[0] : null;
});

router.post('/:uuid/start', async ctx => {
	const uuid = ctx.params.uuid;
	try {
		const activeTasks = taskwarrior.load('+ACTIVE');
		if (activeTasks && activeTasks.length > 0) {
			taskwarrior.executeCommand('+ACTIVE stop');
		}
	} catch (e) {
		console.warn('Failed to stop active tasks:', e);
	}
	const { assignee } = (ctx.request as any).body || {};
	const assigneeMod = assignee ? ` assignee:${assignee}` : '';
	const msg = taskwarrior.executeCommand("'" + uuid + "'" + ' start' + assigneeMod);
	console.log(msg);
	ctx.status = 200;
});

router.post('/:uuid/stop', async ctx => {
	const uuid = ctx.params.uuid;
	const msg = taskwarrior.executeCommand("'" + uuid + "'" + ' stop');
	console.log(msg);
	ctx.status = 200;
});

router.post('/:uuid/annotate', async ctx => {
	const uuid = ctx.params.uuid;
	const body = ctx.request.body as { annotation: string };
	const msg = taskwarrior.executeCommand("'" + uuid + "' annotate " + body.annotation);
	console.log(msg);
	ctx.status = 200;
});

router.post('/:uuid/modify', async ctx => {
	const uuid = ctx.params.uuid;
	const body = ctx.request.body as { command: string };
	const msg = taskwarrior.executeCommand("'" + uuid + "' modify " + body.command);
	console.log(msg);
	ctx.status = 200;
});

router.get('/', async ctx => {
	const tasks = taskwarrior.load();
	ctx.body = tasks;
});

router.put('/', async ctx => {
	const body = ctx.request.body as { tasks: Task[] };
	const msg = taskwarrior.update(body.tasks);
	console.log(msg);
	ctx.status = 200;
});

router.delete('/', async ctx => {
	const tasks = ctx.query.tasks as string[];
	const msg = taskwarrior.del(tasks.map(t => ({ uuid: t })));
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
			
			if (executable === 'task') {
				const isCreation = stringArgs.includes('add') || stringArgs.includes('log');
				if (assignee) {
					stringArgs.push(`assignee:${assignee}`);
				}
				if (isCreation && project) {
					stringArgs.push(`project:${project}`);
				}
				stringArgs.unshift('rc.confirmation=off', 'rc.bulk=0');
			} else if (executable === 'timew') {
				stringArgs.push(':yes');
			}

		// Allow testing locally if TASKRC/TASKDATA are passed as env
		const env = { ...process.env };
		
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
