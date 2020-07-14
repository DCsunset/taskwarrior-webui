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

export default defineComponent({
	setup(_props, context) {
		context.root.$store.dispatch('fetchTasks');

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

		const tasks = computed(() => {
			if (mode.value === 'Tasks')
				return context.root.$store.state.tasks;

			if (project.value)
				return context.root.$store.state.tasks.filter(
					task => task.project === project.value
				);

			return [];
		});

		return {
			mode,
			allModes,
			TaskList,
			tasks,
			projects,
			project
		};
	}
});
</script>
