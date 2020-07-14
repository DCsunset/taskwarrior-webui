import { ActionTree, MutationTree, GetterTree } from 'vuex';
import { Task } from 'taskwarrior-lib';
import { getAccessorType } from 'typed-vuex';

export const state = () => ({
	tasks: [] as Task[],
	snackbar: false,
	notification: {
		color: '',
		text: ''
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
	}
};

export const accessorType = getAccessorType({
	state,
	mutations,
	actions
});
