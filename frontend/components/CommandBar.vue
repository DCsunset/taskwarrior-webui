<template>
	<v-dialog v-model="visible" max-width="600px" @keydown.esc="close">
		<v-card>
			<v-card-text class="pa-0">
				<v-text-field
					ref="inputRef"
					v-model="command"
					prepend-inner-icon="mdi-console"
					placeholder="Enter task or timew command... (e.g., add Buy milk +groceries)"
					hide-details
					solo
					flat
					autofocus
					autocomplete="off"
					@keydown.enter.prevent="executeCommand"
					@keydown.up.prevent="historyUp"
					@keydown.down.prevent="historyDown"
				/>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, nextTick, computed, onMounted, onUnmounted, useContext, useStore, useRoute } from '@nuxtjs/composition-api';
import { accessorType } from '../store';
import { HotkeyBus } from '../plugins/hotkeys';

export default defineComponent({
	name: 'CommandBar',
	setup() {
		const context = useContext();
		const store = useStore<any>();
		const route = useRoute();
		const visible = ref(false);
		const command = ref('');
		const inputRef = ref<any>(null);
		
		const history = ref<string[]>([]);
		const historyIndex = ref(-1);

		const open = () => {
			visible.value = true;
			command.value = '';
			historyIndex.value = history.value.length;
			nextTick(() => {
				if (inputRef.value) {
					inputRef.value.focus();
				}
			});
		};

		const close = () => {
			visible.value = false;
		};

		const historyUp = () => {
			if (historyIndex.value > 0) {
				historyIndex.value--;
				command.value = history.value[historyIndex.value];
			}
		};

		const historyDown = () => {
			if (historyIndex.value < history.value.length - 1) {
				historyIndex.value++;
				command.value = history.value[historyIndex.value];
			} else if (historyIndex.value === history.value.length - 1) {
				historyIndex.value++;
				command.value = '';
			}
		};

		const executeCommand = async () => {
			if (!command.value.trim()) return;
			
			const cmdToRun = command.value.trim();
			
			if (history.value[history.value.length - 1] !== cmdToRun) {
				history.value.push(cmdToRun);
			}
			historyIndex.value = history.value.length;
			
			const assignee = store.state.settings?.assigneeName || '';
			const selectedProject = route.value.query.project as string;
			const project = (selectedProject && selectedProject !== '(All Projects)' && selectedProject !== '(No Project)') ? selectedProject : '';

			try {
				const response = await context.$axios.$post('/api/tasks/command', { 
					command: cmdToRun, 
					assignee,
					project
				});
				
				store.commit('setNotification', {
					color: 'success',
					text: `Command executed successfully.`
				});
				
				// Refresh the tasks list
				await store.dispatch('fetchTasks');
				close();
			} catch (e: any) {
				const errorMsg = e.response?.data?.error || e.message || 'Unknown error';
				const stderr = e.response?.data?.stderr || '';
				store.commit('setNotification', {
					color: 'error',
					text: `Command failed: ${errorMsg} ${stderr}`
				});
			}
		};

		onMounted(() => {
			HotkeyBus.$on('trigger-command-bar', open);
		});

		onUnmounted(() => {
			HotkeyBus.$off('trigger-command-bar', open);
		});

		return {
			visible,
			command,
			inputRef,
			open,
			close,
			executeCommand,
			historyUp,
			historyDown
		};
	}
});
</script>
