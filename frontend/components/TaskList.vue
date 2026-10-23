<template>
	<div>
		<ConfirmationDialog
			v-model="showConfirmationDialog"
			:title="confirmation.title"
			:text="confirmation.text"
			@yes="confirmation.handler"
		/>
		<TaskDialog
			v-model="showTaskDialog"
			:task="currentTask || undefined"
			:initial-project="activeFilterProject"
			:initial-assignee="activeFilterAssignee"
		/>
		<ColumnDialog v-model="showColumnDialog" :active-columns="headers"/>
		<v-row class="px-4 pt-4">
			<v-btn-toggle v-model="selectedStatuses" multiple background-color="rgba(0, 0, 0, 0)">
				<v-row class="pa-3">
					<v-btn
						v-for="st in allStatus"
						:key="st"
						:value="st"
						:color="selectedStatuses.includes(st) ? 'primary' : undefined"
						text
					>
						<v-icon
							class="mr-1"
							:color="selectedStatuses.includes(st) ? 'primary' : undefined"
						>
							{{ statusIcons[st] }}
						</v-icon>
						{{ st }}
						<v-badge
							v-if="st === 'pending' && ((classifiedTasks[st] && classifiedTasks[st].length) || (classifiedTasks[st] && classifiedTasks[st].value && classifiedTasks[st].value.length))"
							:content="classifiedTasks[st].length || (classifiedTasks[st].value && classifiedTasks[st].value.length)"
							:color="selectedStatuses.includes(st) ? 'primary' : 'grey'"
							inline
						/>
					</v-btn>
				</v-row>
			</v-btn-toggle>
		</v-row>

		<v-row class="px-4 pt-4">
		<v-data-table
			:items="displayedTasks"
			:headers="filteredHeaders"
			:options.sync="tableOptions"
			show-select
			item-key="uuid"
			:item-class="rowClass"
			v-model="selected"
			class="elevation-1"
			style="width: 100%"
		>
			<template v-slot:top>
				<v-row class="px-4">
					<!-- Batch actions -->
					<div class="pl-2 pt-2" v-show="selected.length">
						<v-btn
							v-show="hasPendingSelected"
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
							v-show="hasCompletedOrDeletedSelected"
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
							v-show="hasNonDeletedSelected"
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
								v-if="showSyncBtn"
								class="green ml-1"
								fab
								dark
								title="Sync Tasks"
								@click="syncTasks"
							>
								<v-icon>mdi-sync</v-icon>
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
						<v-btn
							class="primary ml-1"
							fab
							dark
							small
							title="Configure Columns"
							@click="showColumnDialog = true"
						>
							<v-icon>mdi-cogs</v-icon>
						</v-btn>
					</div>
				</v-row>
			</template>

			<template v-slot:item.description="{ item }">
				<span v-if="taskMnemonics.has(item.uuid)" class="mnemonic-badge mr-2">{{ taskMnemonics.get(item.uuid) }}</span>
				<span v-html="linkify(item.description)" />
			</template>

			<template v-slot:item.id="{ item }">
				<span class="font-weight-bold primary--text">
					<span v-if="item.id !== 0 && item.id !== undefined && item.id !== null">#{{ item.id }}</span>
					<span v-else>#-</span>
				</span>
				<span v-if="item.uuid" class="caption text--secondary ml-1">({{ item.uuid.substring(0, 8) }})</span>
			</template>

			<template v-slot:item.depends="{ item }">
				<v-chip v-if="item.depends" x-small color="warning" dark :title="'Blocked by: ' + item.depends">
					<v-icon left x-small>mdi-lock-outline</v-icon>{{ formatDepends(item.depends) }}
				</v-chip>
			</template>

			<template v-slot:item.dependents="{ item }">
				<v-chip v-if="getDependents(item)" x-small color="info" dark :title="'Blocking: ' + getDependents(item)">
					<v-icon left x-small>mdi-account-arrow-right-outline</v-icon>{{ getDependents(item) }}
				</v-chip>
			</template>

			<template v-slot:item.priority="{ item }">
				<v-chip v-if="item.priority" x-small :color="getPriorityColor(item.priority)" dark class="priority-chip mr-1">
					{{ item.priority }}
				</v-chip>
			</template>

			<template v-slot:item.wait="{ item }">
				{{ displayDate(item.wait) }}
			</template>
			<template v-slot:item.scheduled="{ item }">
				{{ displayDate(item.scheduled) }}
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
					class="mr-1 mb-1"
				>
					{{ tag }}
					<v-icon
						right
						x-small
						class="ml-1"
						title="Copy tag"
						@click.stop="copyTag(tag)"
					>
						mdi-content-copy
					</v-icon>
				</v-chip>
			</template>

			<template v-slot:item.urgency="{ item }">
				{{ item.urgency }}
			</template>

			<template v-slot:item.actions="{ item }">
				<v-icon
					v-show="item.status === 'pending'"
					v-if="timewPresent"
					size="20px"
					class="ml-2"
					:color="item.start || item.uuid === activeTaskUuid ? 'warning' : 'success'"
					@click="toggleTimer(item)"
					:title="item.start || item.uuid === activeTaskUuid ? 'Stop Timer' : 'Start Timer'"
				>
					{{ item.start || item.uuid === activeTaskUuid ? 'mdi-stop' : 'mdi-play' }}
				</v-icon>
				<v-icon
					v-show="item.status === 'pending'"
					size="20px"
					class="ml-2"
					@click="completeTasks([item])"
					title="Done"
				>
					mdi-check
				</v-icon>
				<v-icon
					v-show="item.status === 'completed' || item.status === 'deleted'"
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
					v-show="item.status !== 'deleted'"
					class="ml-2"
					size="20px"
					@click="deleteTasks([item])"
					title="Delete"
				>
					mdi-delete
				</v-icon>
			</template>
		</v-data-table>
  </v-row>
  </div>
</template>

<script lang="ts">
import { defineComponent, useStore, computed, reactive, ref, ComputedRef, Ref, useRoute, useRouter, watch } from '@nuxtjs/composition-api';
import { Task } from 'taskwarrior-lib';
import _ from 'lodash';
import TaskDialog from '../components/TaskDialog.vue';
import ConfirmationDialog from '../components/ConfirmationDialog.vue';
import ColumnDialog from '../components/ColumnDialog.vue';
import moment from 'moment';
import urlRegex from 'url-regex-safe';
import normalizeUrl from 'normalize-url';
import { accessorType  } from "../store";
import { MnemonicGenerator } from '../utils/mnemonics';

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

function futureDate(str?: string) {
	if (!str)
		return false;

	const date = moment(str);
	return date.isAfter(moment());
}

function linkify(text: string) {
	if (!text) return '';
	const regex = urlRegex();

	let match;
	let lastIndex = 0;
	let result = '';
	while ((match = regex.exec(text)) !== null) {
		const str = text.substring(lastIndex, match.index);
		let href = match[0];
		try {
			href = normalizeUrl(match[0]);
		} catch (e) {
			// Fallback if normalizeUrl fails on pseudo-URL string
		}
		const url = `<a target="_blank" href="${href}">${match[0]}</a>`;
		result = `${result}${str}${url}`;
		lastIndex = match.index + match[0].length;
	}
	result += text.substring(lastIndex);

	return result;
}

export default defineComponent({
	props: {
		tasks: {
			type: Array as () => Task[],
			required: true
		}
	},

	setup(props) {
		const store = useStore<typeof accessorType>();
		const selected = ref([] as Task[]);

		const route = useRoute();
		const router = useRouter();

		const allStatus = ['pending', 'waiting', 'completed', 'deleted', 'recurring'];
		const statusIcons: { [st: string]: string } = {
			pending: 'mdi-clock-outline',
			waiting: 'mdi-pause',
			completed: 'mdi-check',
			deleted: 'mdi-delete',
			recurring: 'mdi-restart'
		};

		const parseStatusQuery = (queryVal: any): string[] => {
			if (queryVal === undefined || queryVal === null) {
				return ['pending'];
			}
			const str = String(queryVal).trim().toLowerCase();
			if (!str || str === 'none') {
				return [];
			}
			if (str === 'all') {
				return [...allStatus];
			}
			const parts = str.split(',').map(s => s.trim().toLowerCase()).filter(s => allStatus.includes(s));
			return parts;
		};

		const activeFilterProject = computed(() => {
			const p = route.value.query.project as string;
			if (p && p !== '(All Projects)' && p !== '(No Project)') return p;
			return '';
		});

		const activeFilterAssignee = computed(() => {
			const a = route.value.query.assignee as string;
			if (a && a !== '(All Assignees)' && a !== '(Unassigned)') return a;
			return '';
		});

		const selectedStatuses = ref<string[]>(parseStatusQuery(route.value.query.status));

		const updateStatusQuery = (statuses: string[]) => {
			const currentQueryStatus = (route.value.query.status as string) || '';
			const sorted = [...statuses].sort((a, b) => allStatus.indexOf(a) - allStatus.indexOf(b));
			let serialized = '';
			if (sorted.length === 0) {
				serialized = 'none';
			} else {
				serialized = sorted.join(',');
			}

			if (currentQueryStatus !== serialized) {
				const query: Record<string, string> = { ...(route.value.query as Record<string, string>) };
				if (serialized === 'pending' && !currentQueryStatus) {
					return;
				}
				query.status = serialized;
				router.replace({ query }).catch(() => {});
			}
		};

		const defaultTableOptions = {
			page: 1,
			itemsPerPage: 10,
			sortBy: ['urgency'],
			sortDesc: [false],
			groupBy: [],
			groupDesc: [],
			multiSort: false,
			mustSort: false
		};

		const loadSavedTableOptions = () => {
			if (typeof window === 'undefined') return { ...defaultTableOptions };
			try {
				const saved = localStorage.getItem('taskListOptions');
				if (saved) {
					const parsed = JSON.parse(saved);
					return {
						...defaultTableOptions,
						...parsed
					};
				}
			} catch (e) {
				// Ignore parse error and return default
			}
			return { ...defaultTableOptions };
		};

		const tableOptions = ref(loadSavedTableOptions());

		watch(tableOptions, (newOptions) => {
			if (typeof window !== 'undefined' && newOptions) {
				try {
					localStorage.setItem('taskListOptions', JSON.stringify({
						itemsPerPage: newOptions.itemsPerPage,
						sortBy: newOptions.sortBy,
						sortDesc: newOptions.sortDesc
					}));
				} catch (e) {
					// Ignore storage errors
				}
			}
		}, { deep: true });

		const headers = computed(() => [
			{ text: 'ID', value: 'id' },
			{ text: 'Project', value: 'project' },
			{ text: 'Description', value: 'description' },
			{ text: 'Priority', value: 'priority' },
			{ text: 'Scheduled', value: 'scheduled' },
			...(selectedStatuses.value.includes('recurring')
				? [{ text: 'Recur', value: 'recur' }]
				: []),
			...(selectedStatuses.value.length === 0 || selectedStatuses.value.some(s => s !== 'waiting')
				? [{ text: 'Due', value: 'due' }]
				: []),
			...(selectedStatuses.value.includes('waiting')
				? [{ text: 'Wait', value: 'wait' }]
				: []),
			{ text: 'Until', value: 'until' },
			{ text: 'Dependencies', value: 'depends' },
			{ text: 'Dependents', value: 'dependents' },
			{ text: 'Tags', value: 'tags' },
			{ text: 'Urgency', value: 'urgency', sort: (a: number, b: number) => b - a },
			{ text: 'Actions', value: 'actions', sortable: false }
		]);

		const filteredHeaders = computed(()=>
			headers.value.filter((v)=> !store.state.hiddenColumns.includes(v.value))
		)

		const showColumnDialog = ref(false);

		const tempTasks: { [key: string]: ComputedRef<Task[]> } = {};
		for (const status of allStatus) {
			tempTasks[status] = computed((): Task[] => props.tasks?.filter(task => {
				if (status === "waiting" || status === "pending") {
					const waiting = (task.wait && !expiredDate(task.wait))
						|| (task.scheduled && futureDate(task.scheduled));
					return task.status === "pending" && (status === "pending" ? !waiting : waiting);
				}
				else if (status === "pending") {
					return task.status === "pending" && !(task.wait && !expiredDate(task.wait));
				}
				else {
					return task.status === status;
				}
			}));
		}
		const classifiedTasks = reactive(tempTasks);

		const displayedTasks = computed((): Task[] => {
			if (!props.tasks || !selectedStatuses.value || !selectedStatuses.value.length) return [];
			const taskSet = new Set<string>();
			const result: Task[] = [];
			for (const st of selectedStatuses.value) {
				const entry: any = classifiedTasks[st];
				const list: Task[] = Array.isArray(entry) ? entry : (entry?.value || []);
				for (const task of list) {
					if (task.uuid && !taskSet.has(task.uuid)) {
						taskSet.add(task.uuid);
						result.push(task);
					}
				}
			}
			return result;
		});

		watch(selectedStatuses, (newStatuses) => {
			if (selected.value.length) {
				selected.value = selected.value.filter(task => displayedTasks.value.some(t => t.uuid === task.uuid));
			}
			updateStatusQuery(newStatuses);
		});

		watch(() => route.value.query.status, (newStatus) => {
			const parsed = parseStatusQuery(newStatus);
			const curSorted = [...selectedStatuses.value].sort().join(',');
			const newSorted = [...parsed].sort().join(',');
			if (curSorted !== newSorted) {
				selectedStatuses.value = parsed;
			}
		});

		const hasPendingSelected = computed(() => selected.value.some(t => t.status === 'pending'));
		const hasCompletedOrDeletedSelected = computed(() => selected.value.some(t => t.status === 'completed' || t.status === 'deleted'));
		const hasNonDeletedSelected = computed(() => selected.value.some(t => t.status !== 'deleted'));

		const refresh = () => {
			store.dispatch('fetchTasks');
		};

		const showConfirmationDialog = ref(false);
		const confirmation = reactive({
			title: 'Confirm',
			text: '',
			handler: () => {}
		});

		const showTaskDialog = ref(false);
		const currentTask: Ref<Task | null> = ref(null);

		const showSyncBtn = computed(() => {
			return store.state.settings.autoSync !== '0';
		});

		const syncTasks = async () => {
			try {
				await store.dispatch('syncTasks');
				store.commit('setNotification', {
					color: 'success',
					text: 'Successfully synced tasks.'
				});
			} catch (error) {
				store.commit('setNotification', {
					color: 'error',
					text: 'Failed to sync tasks.'
				});
			}
		};

		const newTask = () => {
			showTaskDialog.value = true;
			currentTask.value = null;
		};

		const getPriorityColor = (priority?: string) => {
			switch (priority) {
				case 'H': return 'red';
				case 'M': return 'orange';
				case 'L': return 'blue';
				default: return 'grey';
			}
		};

		const editTask = (task: Task) => {
			showTaskDialog.value = true;
			currentTask.value = _.cloneDeep(task);
		};

		const completeTasks = async (tasks: Task[]) => {
			const tasksToComplete = tasks.filter(t => t.status === 'pending');
			if (!tasksToComplete.length) return;
			await store.dispatch('updateTasks', tasksToComplete.map(task => {
				return {
					...task,
					status: 'completed'
				};
			}));
			selected.value = selected.value.filter(task => tasksToComplete.findIndex(t => t.uuid === task.uuid) === -1);
			store.commit('setNotification', {
				color: 'success',
				text: 'Successfully completed the task(s)'
			});
		};

		const deleteTasks = (tasks: Task[]) => {
			const tasksToDelete = tasks.filter(t => t.status !== 'deleted');
			if (!tasksToDelete.length) return;
			confirmation.text = 'Are you sure to delete the task(s)?';
			confirmation.handler = async () => {
				await store.dispatch('deleteTasks', tasksToDelete);
				selected.value = selected.value.filter(task => tasksToDelete.findIndex(t => t.uuid === task.uuid) === -1);
				store.commit('setNotification', {
					color: 'success',
					text: 'Successfully deleted the task(s)'
				});
			};
			showConfirmationDialog.value = true;
		};

		const restoreTasks = (tasks: Task[]) => {
			const tasksToRestore = tasks.filter(t => t.status === 'completed' || t.status === 'deleted');
			if (!tasksToRestore.length) return;
			confirmation.text = 'Are you sure to restore the task(s)?';
			confirmation.handler = async () => {
				await store.dispatch('updateTasks', tasksToRestore.map(task => {
					return {
						...task,
						status: 'pending'
					};
				}));
				selected.value = selected.value.filter(task => tasksToRestore.findIndex(t => t.uuid === task.uuid) === -1);
				store.commit('setNotification', {
					color: 'success',
					text: 'Successfully restored the task(s)'
				});
			};
			showConfirmationDialog.value = true;
		};

		const rowClass = (item: Task) => {
			if (item.mask)
				return 'recur-task';
			else if (item.status !== 'completed' && urgentDate(item.due))
				return 'urgent-task';
			else if (item.status !== 'completed' && expiredDate(item.due))
				return 'expired-task';
			return undefined;
		};

		const copyTag = (tag: string) => {
			if (navigator.clipboard) {
				navigator.clipboard.writeText(tag);
			}
			store.commit('setNotification', {
				color: 'info',
				text: `Tag "${tag}" copied to clipboard`
			});
		};

		const mnemonicGen = new MnemonicGenerator();
		const taskMnemonics = computed(() => {
			mnemonicGen.reset();
			const currentList = displayedTasks.value || [];
			return mnemonicGen.generateMap(currentList, (t) => t.uuid || '', (t) => t.description || '');
		});

		const activeTaskUuid = computed(() => store.state.activeTask?.uuid || '');

		const toggleTimer = async (task: Task) => {
			if (task.start || task.uuid === activeTaskUuid.value) {
				await store.dispatch('stopTimer', task.uuid);
			} else {
				await store.dispatch('startTimer', task.uuid);
			}
		};

		const getTaskId = (t: any) => {
			if (t && t.id !== undefined && t.id !== null && t.id !== '') return t.id;
			return '-';
		};

		const getShortUuid = (t: any) => {
			return t.uuid ? t.uuid.substring(0, 8) : '';
		};

		const taskUuidToIdMap = computed(() => {
			const map: { [uuid: string]: string | number } = {};
			for (const t of props.tasks || []) {
				if (t.uuid) {
					map[t.uuid] = (t.id !== undefined && t.id !== null && t.id !== 0) ? t.id : t.uuid.substring(0, 8);
				}
			}
			return map;
		});

		const formatDepends = (depends: any) => {
			if (!depends) return '';
			if (Array.isArray(depends)) {
				return depends.map(uuid => taskUuidToIdMap.value[uuid] || uuid.substring(0, 8)).join(', ');
			}
			const uuids = String(depends).split(',');
			return uuids.map(u => taskUuidToIdMap.value[u.trim()] || u.trim().substring(0, 8)).join(', ');
		};

		const getDependents = (task: any) => {
			if (!task || !task.uuid) return '';
			const dependents: string[] = [];
			for (const t of props.tasks || []) {
				if (t.depends) {
					const depList = Array.isArray(t.depends) ? t.depends : String(t.depends).split(',').map(s => s.trim());
					if (depList.includes(task.uuid)) {
						dependents.push(String(getTaskId(t)));
					}
				}
			}
			return dependents.join(', ');
		};

		return {
			activeTaskUuid,
			activeFilterProject,
			activeFilterAssignee,
			tableOptions,
			toggleTimer,
			getTaskId,
			getShortUuid,
			formatDepends,
			getDependents,
			copyTag,
			linkify,
			refresh,
			headers,
			filteredHeaders,
			classifiedTasks,
			displayedTasks,
			taskMnemonics,
			selectedStatuses,
			hasPendingSelected,
			hasCompletedOrDeletedSelected,
			hasNonDeletedSelected,
			allStatus,
			statusIcons,
			selected,
			showSyncBtn,
			syncTasks,
			newTask,
			currentTask,
			editTask,
			deleteTasks,
			getPriorityColor,
			completeTasks,
			restoreTasks,
			showTaskDialog,
			showConfirmationDialog,
			showColumnDialog,
			confirmation,
			displayDate,
			rowClass,
			timewPresent: computed(() => store.state.timewPresent),

			TaskDialog,
			ConfirmationDialog,
			ColumnDialog,
		};
	}
});
</script>

<style>
.v-data-table th .v-data-table-header__icon {
  display: block !important;
  margin-top: 4px !important;
  margin-left: 0 !important;
}

.v-data-table th {
  vertical-align: middle;
  text-align: center;
}

.v-application tr.recur-task {
  background-color: #2196F333;
}

.v-application tr.urgent-task {
  background-color: #F4433633;
}

.v-application tr.expired-task {
  background-color: #79554844;
}

.mnemonic-badge {
  display: inline-block;
  background-color: #e53935;
  color: #ffffff;
  font-weight: bold;
  font-size: 0.75rem;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: lowercase;
  font-family: monospace;
}
</style>
