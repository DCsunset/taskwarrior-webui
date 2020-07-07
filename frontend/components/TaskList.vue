<template>
	<div>
		<TaskDialog v-model="showTaskDialog" :task="currentTask" />

		<v-btn-toggle v-model="status" mandatory>
			<v-row class="pa-3">
				<v-btn
					v-for="st in allStatus"
					:key="st"
					:value="st"
					:color="st === status ? 'primary' : undefined"
					text
					@click="st !== status && (selected = [])"
				>
					<v-icon
						class="mr-1"
						:color="st === status ? 'primary' : undefined"
					>
						{{ statusIcons[st] }}
					</v-icon>
					{{ st }}
					<v-badge
						v-if="st === 'pending'"
						:content="classifiedTasks[st].length"
						:color="st === status ? 'primary' : 'grey darken-1'"
						inline
					/>
				</v-btn>
			</v-row>
		</v-btn-toggle>

		<v-data-table
			:items="classifiedTasks[status]"
			:headers="headers"
			show-select
			v-model="selected"
			class="elevation-1"
		>
			<template v-slot:top>
				<v-row class="px-4">
					<!-- Batch actions -->
					<div class="pl-2 pt-2" v-show="selected.length">
						<v-btn
							v-show="status === 'pending'"
							class="ma-1 green"
							fab
							small
							dark
							title="Done"
						>
							<v-icon>mdi-check</v-icon>
						</v-btn>
						<v-btn
							v-show="status !== 'deleted'"
							class="ma-1 red"
							fab
							dark
							small
							title="Delete"
							@click="deleteTasks(selected)"
						>
							<v-icon>mdi-delete</v-icon>
						</v-btn>
					</div>

					<v-spacer />

					<!-- Global Actions -->
					<div class="ma-2">
						<v-btn
							class="green ml-1"
							fab
							dark
							title="Refresh"
							@click="refresh"
						>
							<v-icon>mdi-refresh</v-icon>
						</v-btn>
						<v-btn
							class="primary ml-1"
							fab
							dark
							title="New task"
							@click="newTask"
						>
							<v-icon>mdi-plus</v-icon>
						</v-btn>
					</div>
				</v-row>
			</template>

			<template v-slot:item.actions="{ item }">
				<v-icon
					small
					class="mr-2"
					@click="editTask(item)"
				>
					mdi-pencil
				</v-icon>
				<v-icon
					small
					@click="deleteTasks([item])"
				>
					mdi-delete
				</v-icon>
			</template>
		</v-data-table>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, ref, ComputedRef, Ref } from '@vue/composition-api';
import { Task } from 'taskwarrior-lib';
import _ from 'lodash';
import TaskDialog from '../components/TaskDialog.vue';

interface Props {
	[key: string]: unknown,
	tasks: Task[]
}

export default defineComponent({
	props: {
		tasks: {
			type: Array as () => Task[]
		}
	},

	setup(props: Props, context) {
		const headers = [
			{ text: 'Project', value: 'project' },
			{ text: 'Description', value: 'description' },
			{ text: 'Priority', value: 'priority' },
			{ text: 'Due', value: 'due' },
			{ text: 'Tags', value: 'tags' },
			{ text: 'Actions', value: 'actions', sortable: false }
		];

		const selected = ref([] as Task[]);

		const status = ref('pending');
		const allStatus = ['pending', 'waiting', 'completed', 'deleted', 'recurring'];
		const statusIcons = {
			pending: 'mdi-clock-outline',
			waiting: 'mdi-pause',
			completed: 'mdi-check',
			deleted: 'mdi-delete',
			recurring: 'mdi-restart'
		};

		const tempTasks: { [key: string]: ComputedRef<Task[]> } = {};
		for (const status of allStatus) {
			tempTasks[status] = computed((): Task[] => props.tasks?.filter(task => task.status === status));
		}
		const classifiedTasks = reactive(tempTasks);

		const refresh = () => {
			context.root.$store.dispatch('fetchTasks');
		};

		const showTaskDialog = ref(false);
		const currentTask: Ref<Task> = ref(null);
		const newTask = () => {
			showTaskDialog.value = true;
			currentTask.value = null;
		};

		const editTask = (_task: Task) => {
			// TODO
		};

		const deleteTasks = async (tasks: Task[]) => {
			await context.root.$store.dispatch('deleteTasks', tasks);
			_.remove(selected.value, task => tasks.findIndex(t => t.uuid === task.uuid) !== -1);
		};

		return {
			refresh,
			headers,
			classifiedTasks,
			status,
			allStatus,
			statusIcons,
			selected,
			newTask,
			currentTask,
			editTask,
			deleteTasks,
			showTaskDialog,
			TaskDialog
		};
	}
});
</script>
