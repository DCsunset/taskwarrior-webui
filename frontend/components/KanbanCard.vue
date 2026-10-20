<template>
	<v-card class="ma-2 kanban-card" elevation="2" :class="{ 'active-border': isActive }">
		<v-card-subtitle class="pb-1 pt-2 d-flex align-center">
			<span class="caption font-weight-bold primary--text mr-2">
				<span v-if="task.id !== 0 && task.id !== undefined && task.id !== null">#{{ task.id }}</span>
				<span v-else>#-</span>
				({{ getShortUuid(task) }})
			</span>
			<v-chip v-if="isActive" x-small color="success" dark class="font-weight-bold mr-1">
				<v-icon left x-small>mdi-clock-fast</v-icon>{{ elapsedTimeDisplay }}
			</v-chip>
			<v-spacer />
			<v-chip v-if="task.priority" x-small :color="priorityColor" dark class="priority-chip mr-1">
				{{ task.priority }}
			</v-chip>
			<v-chip x-small color="grey" dark class="caption">
				{{ task.urgency ? task.urgency.toFixed(1) : '0' }}
			</v-chip>
		</v-card-subtitle>

		<v-card-text class="pt-1 pb-2">
			<div class="subtitle-2 text-wrap mb-1" v-html="linkify(task.description)" />

			<div class="d-flex flex-wrap align-center mt-2">
				<v-chip v-if="task.project" small color="primary" outlined class="mr-1 mb-1" style="font-size: 12px;">
					<v-icon left small>mdi-folder-outline</v-icon>
					{{ task.project }}
				</v-chip>
				<v-chip v-if="task.assignee || task.assignees" small color="teal" dark class="mr-1 mb-1" style="font-size: 12px;">
					<v-icon left small>mdi-account-outline</v-icon>
					{{ task.assignee || task.assignees }}
				</v-chip>
				<v-chip v-for="tag in task.tags" :key="tag" small color="grey darken-1" dark class="mr-1 mb-1" style="font-size: 12px;">
					+{{ tag }}
				</v-chip>
				<v-chip v-if="task.depends" small color="warning" dark class="mr-1 mb-1" :title="'Blocked by: ' + formatDepends(task.depends)" style="font-size: 12px;">
					<v-icon left small>mdi-lock-outline</v-icon>BLOCKED ({{ formatDepends(task.depends) }})
				</v-chip>
				<v-chip v-if="getDependents(task)" small color="info" dark class="mr-1 mb-1" :title="'Blocking: ' + getDependents(task)" style="font-size: 12px;">
					<v-icon left small>mdi-account-arrow-right-outline</v-icon>BLOCKING ({{ getDependents(task) }})
				</v-chip>
				<v-chip v-if="task.recur" small color="info" dark class="mr-1 mb-1" style="font-size: 12px;">
					<v-icon left small>mdi-restart</v-icon>RECUR
				</v-chip>
			</div>
		</v-card-text>

		<v-divider />

		<v-card-actions class="py-1 px-2">
			<v-btn v-if="timewPresent" icon x-small :color="isActive ? 'warning' : 'success'" title="Start/Stop Timer" @click.stop="$emit('toggle-timer', task)">
				<v-icon x-small>{{ isActive ? 'mdi-stop' : 'mdi-play' }}</v-icon>
			</v-btn>
			<v-btn icon x-small color="green" title="Complete Task" @click.stop="$emit('complete', task)">
				<v-icon x-small>mdi-check</v-icon>
			</v-btn>
			<v-btn icon x-small color="primary" title="Edit Task" @click.stop="$emit('edit', task)">
				<v-icon x-small>mdi-pencil</v-icon>
			</v-btn>
			<v-spacer />
			<v-btn icon x-small color="red" title="Delete Task" @click.stop="$emit('delete', task)">
				<v-icon x-small>mdi-delete</v-icon>
			</v-btn>
		</v-card-actions>
	</v-card>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted, watch, useStore } from '@nuxtjs/composition-api';
import { Task } from 'taskwarrior-lib';
import { accessorType  } from "../store";
import urlRegex from 'url-regex-safe';
import normalizeUrl from 'normalize-url';
import { getActiveElapsedSeconds, formatDuration } from '../utils/duration';

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
	name: 'KanbanCard',
	props: {
		task: {
			type: Object as () => Task,
			required: true
		},
		allTasks: {
			type: Array as () => Task[],
			default: () => []
		},
		activeTaskUuid: {
			type: String,
			default: ''
		}
	},
	setup(props) {
		const store = useStore<typeof accessorType>();
		const isActive = computed(() => props.task.uuid === props.activeTaskUuid || Boolean(props.task.start));

		const elapsedSeconds = ref(0);
		let timerInterval: any = null;

		const updateElapsed = () => {
			if (props.task.start) {
				elapsedSeconds.value = getActiveElapsedSeconds(props.task.start);
			} else {
				elapsedSeconds.value = 0;
			}
		};

		watch(() => props.task, updateElapsed, { immediate: true });

		onMounted(() => {
			timerInterval = setInterval(() => {
				if (props.task.start) {
					elapsedSeconds.value++;
				}
			}, 1000);
		});

		onUnmounted(() => {
			if (timerInterval) clearInterval(timerInterval);
		});

		const elapsedTimeDisplay = computed(() => formatDuration(elapsedSeconds.value));

		const priorityColor = computed(() => {
			switch (props.task.priority) {
				case 'H': return 'red';
				case 'M': return 'orange';
				case 'L': return 'blue';
				default: return 'grey';
			}
		});

		const getTaskId = (t: any) => {
			if (t && t.id !== undefined && t.id !== null && t.id !== '') return t.id;
			return '-';
		};

		const getShortUuid = (t: any) => {
			return t.uuid ? t.uuid.substring(0, 8) : '';
		};

		const taskUuidToIdMap = computed(() => {
			const map: { [uuid: string]: string | number } = {};
			for (const t of props.allTasks || []) {
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
			for (const t of props.allTasks || []) {
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
			isActive,
			elapsedTimeDisplay,
			priorityColor,
			linkify,
			getTaskId,
			getShortUuid,
			formatDepends,
			getDependents,
			timewPresent: computed(() => store.state.timewPresent)
		};
	}
});
</script>

<style scoped>
.kanban-card {
	cursor: grab;
	transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.kanban-card:active {
	cursor: grabbing;
}
.active-border {
	border: 2px solid #4CAF50 !important;
}
.priority-chip {
	font-weight: bold !important;
}
</style>
