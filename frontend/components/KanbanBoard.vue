<template>
	<div class="kanban-board-container pa-4">
		<v-row>
			<v-col v-for="col in columns" :key="col.id" cols="12" sm="6" md="3">
				<v-card class="column-card elevation-2" :color="$vuetify.theme.dark ? '#333333' : 'grey lighten-4'">
					<v-card-title class="subtitle-1 font-weight-bold d-flex align-center py-2 px-3">
						<v-icon left small :color="col.color">{{ col.icon }}</v-icon>
						{{ col.title }}
						<v-spacer />
						<v-chip x-small color="grey" dark>{{ col.tasks.length }}</v-chip>
					</v-card-title>
					<v-divider />
					<v-card-text class="pa-2 column-content">
						<draggable
							v-model="col.tasks"
							group="tasks"
							item-key="uuid"
							class="draggable-list"
							@change="(evt) => onDragChange(evt, col.id)"
						>
							<KanbanCard
								v-for="task in col.tasks"
								:key="task.uuid"
								:task="task"
								:all-tasks="tasks"
								:active-task-uuid="activeTaskUuid"
								@toggle-timer="$emit('toggle-timer', $event)"
								@complete="$emit('complete', $event)"
								@edit="$emit('edit', $event)"
								@delete="$emit('delete', $event)"
							/>
						</draggable>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@nuxtjs/composition-api';
import { Task } from 'taskwarrior-lib';
import draggable from 'vuedraggable';
import KanbanCard from './KanbanCard.vue';

export default defineComponent({
	name: 'KanbanBoard',
	components: {
		draggable,
		KanbanCard
	},
	props: {
		tasks: {
			type: Array as () => Task[],
			required: true
		},
		activeTaskUuid: {
			type: String,
			default: ''
		}
	},
	setup(props, ctx) {
		const todoTasks = ref<Task[]>([]);
		const inProgressTasks = ref<Task[]>([]);
		const waitingTasks = ref<Task[]>([]);
		const doneTasks = ref<Task[]>([]);

		const categorizeTasks = () => {
			const todo: Task[] = [];
			const inProgress: Task[] = [];
			const waiting: Task[] = [];
			const done: Task[] = [];

			(props.tasks || []).forEach(task => {
				if (task.status === 'completed') {
					done.push(task);
				} else if (task.start || task.uuid === props.activeTaskUuid) {
					inProgress.push(task);
				} else if (task.wait || task.scheduled) {
					waiting.push(task);
				} else {
					todo.push(task);
				}
			});

			todoTasks.value = todo;
			inProgressTasks.value = inProgress;
			waitingTasks.value = waiting;
			doneTasks.value = done;
		};

		watch([() => props.tasks, () => props.activeTaskUuid], categorizeTasks, { immediate: true });

		const columns = computed(() => [
			{ id: 'todo', title: 'To Do', color: 'blue', icon: 'mdi-clock-outline', tasks: todoTasks.value },
			{ id: 'inProgress', title: 'In Progress', color: 'orange', icon: 'mdi-play-circle-outline', tasks: inProgressTasks.value },
			{ id: 'waiting', title: 'Waiting', color: 'purple', icon: 'mdi-pause-circle-outline', tasks: waitingTasks.value },
			{ id: 'done', title: 'Done', color: 'green', icon: 'mdi-check-circle-outline', tasks: doneTasks.value }
		]);

		const onDragChange = (evt: any, targetColumnId: string) => {
			if (evt.added) {
				const task: Task = evt.added.element;
				ctx.emit('column-change', { task, targetColumnId });
			}
		};

		return {
			columns,
			onDragChange
		};
	}
});
</script>

<style scoped>
.kanban-board-container {
	width: 100%;
}
.column-card {
	min-height: 500px;
	border-radius: 8px;
}
.column-content {
	min-height: 450px;
}
.draggable-list {
	min-height: 430px;
}
</style>
