<template>
	<div>
		<ConfirmationDialog
			v-model="showConfirmationDialog"
			:title="confirmation.title"
			:text="confirmation.text"
			@yes="confirmation.handler"
		/>
		<TaskDialog v-model="showTaskDialog" :task="currentTask" />

		<v-btn-toggle v-model="status" mandatory background-color="rgba(0, 0, 0, 0)">
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
						v-if="st === 'pending' && classifiedTasks[st].length"
						:content="classifiedTasks[st].length"
						:color="st === status ? 'primary' : 'grey'"
						inline
					/>
				</v-btn>
			</v-row>
		</v-btn-toggle>

		<v-data-table
			:items="classifiedTasks[status]"
			:headers="headers"
			show-select
			item-key="uuid"
			:item-class="rowClass"
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
							@click="completeTasks(selected)"
						>
							<v-icon>mdi-check</v-icon>
						</v-btn>
						<v-btn
							v-show="status === 'completed' || status === 'deleted'"
							class="ma-1"
							color="primary"
							fab
							dark
							small
							title="Restore"
							@click="restoreTasks(selected)"
						>
							<v-icon>mdi-restore</v-icon>
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

			<template v-if="status === 'waiting'" v-slot:item.wait="{ item }">
				{{ displayDate(item.wait) }}
			</template>
			<template v-slot:item.due="{ item }">
				{{ displayDate(item.due) }}
			</template>
			<template v-slot:item.until="{ item }">
				{{ displayDate(item.until) }}
			</template>

			<template v-slot:item.tags="{ item }">
				<v-chip
					v-for="tag in item.tags"
					:key="tag"
					small
				>
					{{ tag }}
				</v-chip>
			</template>

			<template v-slot:item.urgency="{ item }">
				{{ item.urgency }}
			</template>

			<template v-slot:item.actions="{ item }">
				<v-icon
					v-show="status === 'pending'"
					size="20px"
					class="ml-2"
					@click="completeTasks([item])"
					title="Done"
				>
					mdi-check
				</v-icon>
				<v-icon
					v-show="status === 'completed' || status === 'deleted'"
					size="20px"
					class="ml-2"
					@click="restoreTasks([item])"
					title="Restore"
				>
					mdi-restore
				</v-icon>
				<v-icon
					class="ml-2"
					size="20px"
					@click="editTask(item)"
					title="Edit"
				>
					mdi-pencil
				</v-icon>
				<v-icon
					v-show="status !== 'deleted'"
					class="ml-2"
					size="20px"
					@click="deleteTasks([item])"
					title="Delete"
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
import ConfirmationDialog from '../components/ConfirmationDialog.vue';
import moment from 'moment';

function displayDate(str?: string) {
	if (!str)
		return str;

	const date = moment(str);
	const diff = moment.duration(date.diff(moment()));
	if (Math.abs(diff.asDays()) < 1)
		return diff.humanize(true);
	return date.format('YYYY-MM-DD');
}

function urgentDate(str?: string) {
	if (!str)
		return false;

	const date = moment(str);
	const diff = moment.duration(date.diff(moment()));
	const days = diff.asDays();
	if (days > 0 && days < 1)
		return true;

	return false;
}

function expiredDate(str?: string) {
	if (!str)
		return false;

	const date = moment(str);
	return date.isBefore(moment());
}

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
		const headers = computed(() => [
			{ text: 'Project', value: 'project' },
			{ text: 'Description', value: 'description' },
			{ text: 'Priority', value: 'priority' },
			...(status.value === 'recurring'
				? [{ text: 'Recur', value: 'recur' }]
				: []),
			...(status.value !== 'waiting'
				? [{ text: 'Due', value: 'due' }]
				: [{ text: 'Wait', value: 'wait' }]),
			{ text: 'Until', value: 'until' },
			{ text: 'Tags', value: 'tags' },
			{ text: 'Urgency', value: 'urgency' },
			{ text: 'Actions', value: 'actions', sortable: false }
		]);

		const tempTasks: { [key: string]: ComputedRef<Task[]> } = {};
		for (const status of allStatus) {
			tempTasks[status] = computed((): Task[] => props.tasks?.filter(task => task.status === status));
		}
		const classifiedTasks = reactive(tempTasks);

		const refresh = () => {
			context.root.$store.dispatch('fetchTasks');
		};

		const showConfirmationDialog = ref(false);
		const confirmation = reactive({
			title: 'Confirm',
			text: '',
			handler: () => {}
		});

		const showTaskDialog = ref(false);
		const currentTask: Ref<Task | null> = ref(null);
		const newTask = () => {
			showTaskDialog.value = true;
			currentTask.value = null;
		};

		const editTask = (task: Task) => {
			showTaskDialog.value = true;
			currentTask.value = _.cloneDeep(task);
		};

		const completeTasks = async (tasks: Task[]) => {
			await context.root.$store.dispatch('updateTasks', tasks.map(task => {
				return {
					...task,
					status: 'completed'
				};
			}));
			selected.value = selected.value.filter(task => tasks.findIndex(t => t.uuid === task.uuid) === -1);
			context.root.$store.commit('setNotification', {
				color: 'success',
				text: 'Successfully complete the task(s)'
			});
		};

		const deleteTasks = (tasks: Task[]) => {
			confirmation.text = 'Are you sure to delete the task(s)?';
			confirmation.handler = async () => {
				await context.root.$store.dispatch('deleteTasks', tasks);
				selected.value = selected.value.filter(task => tasks.findIndex(t => t.uuid === task.uuid) === -1);
				context.root.$store.commit('setNotification', {
					color: 'success',
					text: 'Successfully delete the task(s)'
				});
			};
			showConfirmationDialog.value = true;
		};

		const restoreTasks = (tasks: Task[]) => {
			confirmation.text = 'Are you sure to restore the task(s)?';
			confirmation.handler = async () => {
				await context.root.$store.dispatch('updateTasks', tasks.map(task => {
					return {
						...task,
						status: 'pending'
					};
				}));
				selected.value = selected.value.filter(task => tasks.findIndex(t => t.uuid === task.uuid) === -1);
				context.root.$store.commit('setNotification', {
					color: 'success',
					text: 'Successfully restore the task(s)'
				});
			};
			showConfirmationDialog.value = true;
		};

		const rowClass = (item: Task) => {
			if (item.mask)
				return 'recur-task';
			else if (status.value !== 'completed' && urgentDate(item.due))
				return 'urgent-task';
			else if (status.value !== 'completed' && expiredDate(item.due))
				return 'expired-task';
			return undefined;
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
			completeTasks,
			restoreTasks,
			showTaskDialog,
			showConfirmationDialog,
			confirmation,
			displayDate,
			rowClass,

			TaskDialog,
			ConfirmationDialog
		};
	}
});
</script>

<style>
.v-application tr.recur-task {
  background-color: #2196F333;
}

.v-application tr.urgent-task {
  background-color: #F4433633;
}

.v-application tr.expired-task {
  background-color: #79554844;
}
</style>
