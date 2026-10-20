import * as Router from '@koa/router';
import taskwarrior from './taskwarrior';

const router = new Router();

interface ProjectReport {
	name: string;
	completed: number;
	pending: number;
	total: number;
	progress: number;
}

router.get('/projects', async ctx => {
	const allTasks = taskwarrior.load();
	const projectMap: Record<string, { completed: number; pending: number }> = {};

	allTasks.forEach((task: any) => {
		const proj = task.project || '(Unassigned)';
		if (!projectMap[proj]) {
			projectMap[proj] = { completed: 0, pending: 0 };
		}
		if (task.status === 'completed') {
			projectMap[proj].completed++;
		} else if (task.status === 'pending') {
			projectMap[proj].pending++;
		}
	});

	const reports: ProjectReport[] = Object.keys(projectMap).map(name => {
		const { completed, pending } = projectMap[name];
		const total = completed + pending;
		const progress = total === 0 ? 100 : Math.round((completed / total) * 100);
		return {
			name,
			completed,
			pending,
			total,
			progress
		};
	});

	ctx.body = reports;
});

export default router;
