import { ActionTree, MutationTree, GetterTree } from 'vuex';
import { Task } from 'taskwarrior-lib';
import { getAccessorType } from 'typed-vuex';

export const state = () => ({
	tasks: [] as Task[],
	activeTask: null as Task | null,
	snackbar: false,
	notification: {
		color: '',
		text: ''
	},
	settings: {
		dark: false,
		autoRefresh: '5', // in minutes
		autoSync: '0', // in minutes
		assigneeName: ''
	},
	hiddenColumns: [] as string[],
	timewPresent: true
});

export type RootState = ReturnType<typeof state>;

export const getters: GetterTree<RootState, RootState> = {
	projects: state => Array.from(new Set(state.tasks.map(task => task.project).filter((p): p is string => Boolean(p)))),
	tags: state => state.tasks.reduce((tags: string[], task) => {
		return task.tags ? tags.concat(task.tags) : tags;
	}, []),
	assignees: state => Array.from(new Set(state.tasks.map((t: any) => t.assignee || t.assignees).filter((a): a is string => Boolean(a))))
};

export const mutations: MutationTree<RootState> = {
	setSettings(state, settings) {
		state.settings = settings;
	},

	setTasks(state, tasks: Task[]) {
		state.tasks = tasks;
	},

	setActiveTask(state, activeTask: Task | null) {
		state.activeTask = activeTask;
	},

	setHiddenColumns(state, hiddenColumns) {
		state.hiddenColumns = hiddenColumns;
	},

	setNotification(state, notification) {
		state.notification = notification;
		// Show notification
		state.snackbar = true;
	},

	setSnackbar(state, value) {
		state.snackbar = value;
	},

	setTimewPresent(state, present: boolean) {
		state.timewPresent = present;
	}
};

export const actions: ActionTree<RootState, RootState> = {
	async fetchTimewStatus(context) {
		try {
			const { present } = await this.$axios.$get('/api/tasks/timew-status');
			context.commit('setTimewPresent', present);
		} catch (e) {
			context.commit('setTimewPresent', false);
		}
	},
	fetchSettings(context) {
		const settings = localStorage.getItem('settings');
		if (settings) {
			context.commit('setSettings', JSON.parse(settings));
		}
	},

	updateSettings(context, settings) {
		context.commit('setSettings', settings);
		localStorage.setItem('settings', JSON.stringify(settings));
	},

	fetchHiddenColumns(context) {
		const columns = localStorage.getItem('hiddenColumns');
		if (columns) {
			context.commit('setHiddenColumns', JSON.parse(columns));
		}
	},

	updateHiddenColumns(context, columns) {
		context.commit('setHiddenColumns', columns);
		localStorage.setItem('hiddenColumns', JSON.stringify(columns));
	},

	async fetchTasks(context) {
		const tasks: Task[] = await this.$axios.$get('/api/tasks');
		context.commit('setTasks', tasks);
		await context.dispatch('fetchActiveTask');
	},

	async fetchActiveTask(context) {
		const activeTask: Task | null = await this.$axios.$get('/api/tasks/active');
		context.commit('setActiveTask', activeTask);
	},

	async startTimer(context, uuid: string) {
		const assignee = context.state.settings.assigneeName;
		await this.$axios.$post('/api/tasks/' + uuid + '/start', { assignee });
		await context.dispatch('fetchTasks');
	},

	async stopTimer(context, uuid: string) {
		await this.$axios.$post('/api/tasks/' + uuid + '/stop');
		await context.dispatch('fetchTasks');
	},

	async deleteTasks(context, tasks: Task[]) {
		await this.$axios.$delete('/api/tasks', {
			params: { tasks: tasks.map(task => task.uuid) }
		});
		// Refresh
		await context.dispatch('fetchTasks');
	},

	async updateTasks(context, tasks: Task[]) {
		await this.$axios.$put('/api/tasks', { tasks });
		// Refresh
		await context.dispatch('fetchTasks');
	},

	async syncTasks(_context) {
		await this.$axios.$post('/api/sync');
	}
};

export const accessorType = getAccessorType({
	state,
	mutations,
	actions
});
