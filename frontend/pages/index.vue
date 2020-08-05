<template>
	<div class="px-md-6 px-lg-12">
		<v-row class="px-4 pt-4">
			<div class="headline d-flex align-center">{{ mode }}</div>
			<template v-if="mode === 'Projects'">
				<v-icon class="mx-2">
					mdi-chevron-right
				</v-icon>

				<v-select
					class="mb-3"
					:items="projects"
					label="Project"
					v-model="project"
					style="max-width: 120px"
					hide-details
				/>
				<div class="ml-6 d-flex align-center">
					<v-progress-circular
						:size="54"
						:width="5"
						:value="progress"
						color="primary"
					>
						{{ progress }}%
					</v-progress-circular>
				</div>
			</template>

			<v-spacer />
			<v-select
				class="mb-3 ml-3"
				:items="allModes"
				label="Display Mode"
				v-model="mode"
				style="max-width: 120px"
				hide-details
			/>
		</v-row>

		<TaskList :tasks="tasks" />
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, ComputedRef } from '@vue/composition-api';
import TaskList from '../components/TaskList.vue';
import { Task } from 'taskwarrior-lib';

export default defineComponent({
	setup(_props, context) {
		context.root.$store.dispatch('fetchTasks');

		let interval: NodeJS.Timeout | null = null;
		const setAutoRefresh = () => {
			if (interval)
				clearInterval(interval);
			const freq = +context.root.$store.state.settings.autoRefresh;
			if (freq > 0) {
				interval = setInterval(() => {
					context.root.$store.dispatch('fetchTasks');
				}, +context.root.$store.state.settings.autoRefresh * 60000);
			}
		};
		setAutoRefresh();
		watch(() => context.root.$store.state.settings, setAutoRefresh);

		const mode = ref('Tasks');
		const allModes = ['Tasks', 'Projects'];

		const project = ref('');
		const projects: ComputedRef<string[]> = computed(() => context.root.$store.getters.projects);
		watch(projects, () => {
			if (projects.value.includes(project.value))
				return;
			if (projects.value.length)
				project.value = projects.value[0];
			else
				project.value = '';
		});

		const tasks: ComputedRef<Task[]> = computed(() => {
			if (mode.value === 'Tasks')
				return context.root.$store.state.tasks;

			if (project.value)
				return context.root.$store.state.tasks.filter(
					(task: Task) => task.project === project.value
				);

			return [];
		});

		const progress = computed(() => {
			if (mode.value === 'Projects' && project.value) {
				const completed = tasks.value.reduce((acc: number, task) => task.status === 'completed' ? acc + 1 : acc, 0);
				const pending = tasks.value.reduce((acc: number, task) => task.status === 'pending' ? acc + 1 : acc, 0);
				return completed + pending === 0
					? 100
					: Math.ceil(100 * completed / (completed + pending));
			}
			return 0;
		});

		return {
			mode,
			allModes,
			TaskList,
			tasks,
			projects,
			project,
			progress
		};
	}
});
</script>
