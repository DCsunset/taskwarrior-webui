import { TaskwarriorLib } from 'taskwarrior-lib';
import * as Router from '@koa/router';
import { ParameterizedContext } from 'koa';

export interface TaskProfile {
	name: string;
	rcPath?: string;
	dataPath?: string;
}

const defaultRc = process.env.TASKRC;
const defaultData = process.env.TASKDATA;

const profilesMap = new Map<string, TaskProfile>();
const instancesMap = new Map<string, TaskwarriorLib>();

// Default profile
const defaultProfile: TaskProfile = {
	name: 'Default',
	rcPath: defaultRc,
	dataPath: defaultData
};
profilesMap.set('Default', defaultProfile);

// Parse TASK_PROFILES if defined
// Supported formats:
// 1. JSON string: '{"Work": {"rcPath": "/path/to/.taskrc", "dataPath": "/path/to/.task"}}'
// 2. Comma separated list: 'Work:~/.taskrc.work:~/.task.work,Personal:~/.taskrc.personal:~/.task.personal'
if (process.env.TASK_PROFILES) {
	const raw = process.env.TASK_PROFILES.trim();
	if (raw.startsWith('{') || raw.startsWith('[')) {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				for (const item of parsed) {
					if (item && item.name) {
						profilesMap.set(item.name, {
							name: item.name,
							rcPath: item.rcPath || item.taskrc,
							dataPath: item.dataPath || item.taskdata
						});
					}
				}
			} else if (typeof parsed === 'object') {
				for (const [name, cfg] of Object.entries(parsed)) {
					const c = cfg as any;
					profilesMap.set(name, {
						name,
						rcPath: c.rcPath || c.taskrc,
						dataPath: c.dataPath || c.taskdata
					});
				}
			}
		} catch (e) {
			console.error('Failed to parse TASK_PROFILES JSON:', e);
		}
	} else {
		// Comma-separated list: Name:rcPath:dataPath,Name2:rcPath2:dataPath2
		const parts = raw.split(',');
		for (const part of parts) {
			const [name, rcPath, dataPath] = part.split(':').map(s => s?.trim());
			if (name) {
				profilesMap.set(name, {
					name,
					rcPath: rcPath || undefined,
					dataPath: dataPath || undefined
				});
			}
		}
	}
}

export function getProfiles(): TaskProfile[] {
	return Array.from(profilesMap.values());
}

export function getProfile(profileName?: string): TaskProfile {
	const name = (profileName && profilesMap.has(profileName)) ? profileName : 'Default';
	return profilesMap.get(name)!;
}

export function getTaskwarrior(profileName?: string, contextOverride?: string): TaskwarriorLib {
	const profile = getProfile(profileName);

	let instance = instancesMap.get(profile.name);
	if (!instance) {
		instance = new TaskwarriorLib(profile.rcPath, profile.dataPath);
		// Wrap executeCommand to always suppress color and width wrapping
		const originalExec = instance.executeCommand.bind(instance);
		instance.executeCommand = function (args: string = '', input?: string): string {
			const safeArgs = `rc._forcecolor=off rc.defaultwidth=0 ${args}`.trim();
			return originalExec(safeArgs, input);
		};
		instancesMap.set(profile.name, instance);
	}

	if (!contextOverride) {
		return instance;
	}

	// If contextOverride is specified, return a lightweight proxy that injects rc.context
	const originalExecuteCommand = instance.executeCommand.bind(instance);
	const originalLoad = instance.load.bind(instance);

	const proxyInstance = Object.create(instance) as TaskwarriorLib;
	proxyInstance.executeCommand = (args: string = '', input?: string) => {
		const safeArgs = `rc.context=${contextOverride} ${args}`.trim();
		return originalExecuteCommand(safeArgs, input);
	};
	proxyInstance.load = (filters?: string) => {
		const safeFilters = filters ? `rc.context=${contextOverride} ${filters}` : `rc.context=${contextOverride}`;
		return originalLoad(safeFilters);
	};

	return proxyInstance;
}

export function getTaskwarriorFromCtx(ctx: ParameterizedContext<any, any>): TaskwarriorLib {
	const profileHeader = ctx.headers['x-taskwarrior-profile'] as string | undefined;
	const contextHeader = ctx.headers['x-taskwarrior-context'] as string | undefined;
	const profileQuery = ctx.query.profile as string | undefined;
	const contextQuery = ctx.query.context as string | undefined;

	const profile = profileHeader || profileQuery;
	const context = contextHeader || contextQuery;

	return getTaskwarrior(profile, context);
}

const router = new Router();
router.get('/', (ctx) => {
	ctx.body = {
		profiles: getProfiles().map(p => p.name),
		defaultProfile: 'Default'
	};
});

export default router;
