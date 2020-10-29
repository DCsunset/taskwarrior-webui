import { ActionTree, MutationTree, GetterTree } from 'vuex';
import { Task } from 'taskwarrior-lib';
import { getAccessorType } from 'typed-vuex';

export const state = () => ({
	tasks: [] as Task[],
	snackbar: false,
	notification: {
		color: '',
		text: ''
	},
	settings: {
		dark: false,
		autoRefresh: '5', // in minutes
		autoSync: '0' // in minutes
	}
});

export type RootState = ReturnType<typeof state>;

export const getters: GetterTree<RootState, RootState> = {
	projects: state => state.tasks.map(task => task.project).filter(p => p !== undefined),
	tags: state => state.tasks.reduce((tags: string[], task) => {
		return task.tags ? tags.concat(task.tags) : tags;
	}, [])
};

export const mutations: MutationTree<RootState> = {
	setSettings(state, settings) {
		state.settings = settings;
	},

	setTasks(state, tasks: Task[]) {
		state.tasks = tasks;
	},

	setNotification(state, notification) {
		state.notification = notification;
		// Show notification
		state.snackbar = true;
	},

	setSnackbar(state, value) {
		state.snackbar = value;
	}
};

export const actions: ActionTree<RootState, RootState> = {
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

	async fetchTasks(context) {
		const tasks: Task[] = await this.$axios.$get('/api/tasks');
		context.commit('setTasks', tasks);
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
