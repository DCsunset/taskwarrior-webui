<template>
	<div class="px-md-6 px-lg-12">
		<v-row class="px-4 pt-4">
			<div class="headline d-flex align-center">{{ mode }}</div>
			<v-spacer />
			<v-select
				class="mb-2"
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
import { defineComponent, ref, computed } from '@vue/composition-api';
import TaskList from '../components/TaskList.vue';

export default defineComponent({
	setup(_props, context) {
		context.root.$store.dispatch('fetchTasks');

		const mode = ref('Tasks');
		const allModes = ['Tasks', 'Projects'];

		const tasks = computed(() => context.root.$store.state.tasks);

		return {
			mode,
			allModes,
			TaskList,
			tasks
		};
	}
});
</script>
