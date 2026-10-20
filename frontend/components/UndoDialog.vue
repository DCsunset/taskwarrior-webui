<template>
	<v-dialog
		v-model="showDialog"
		max-width="600px"
		persistent
		@keydown.esc="closeDialog"
	>
		<v-card>
			<v-card-title class="headline warning--text d-flex align-center">
				<v-icon left color="warning">mdi-undo-variant</v-icon>
				Confirm Task Undo
			</v-card-title>
			<v-card-text>
				<p class="body-1">
					Are you sure you want to revert the last Taskwarrior operation?
				</p>
				<v-alert v-if="loading" type="info" text dense class="my-2">
					Loading undo operations preview...
				</v-alert>
				<v-card v-else outlined class="pa-3 grey lighten-4">
					<pre class="caption text-wrap">{{ previewText || 'No undo operation preview available.' }}</pre>
				</v-card>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="closeDialog" width="90px">
					Cancel
				</v-btn>
				<v-btn color="warning" :loading="executing" @click="confirmUndo" width="90px">
					Undo
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, useStore, computed, ref, watch } from '@nuxtjs/composition-api';
import { accessorType } from '../store';

export default defineComponent({
	name: 'UndoDialog',
	props: {
		value: Boolean
	},
	setup(props, ctx) {
		const store = useStore<typeof accessorType>();
		const loading = ref(false);
		const executing = ref(false);
		const previewText = ref('');

		const showDialog = computed({
			get: () => props.value,
			set: val => ctx.emit('input', val)
		});

		const fetchPreview = async () => {
			if (!showDialog.value) return;
			loading.value = true;
			try {
				const res: any = await (store as any).$axios.$get('/api/tasks/undo/preview');
				previewText.value = res.report || 'The last operation will be reverted.';
			} catch (e) {
				previewText.value = 'Reverting last Taskwarrior operation.';
			} finally {
				loading.value = false;
			}
		};

		watch(showDialog, (val) => {
			if (val) fetchPreview();
		});

		const closeDialog = () => {
			showDialog.value = false;
		};

		const confirmUndo = async () => {
			executing.value = true;
			try {
				await (store as any).$axios.$post('/api/tasks/undo');
				store.commit('setNotification', {
					color: 'success',
					text: 'Successfully reverted last task operation.'
				});
				await store.dispatch('fetchTasks');
			} catch (e: any) {
				store.commit('setNotification', {
					color: 'error',
					text: 'Failed to undo last operation.'
				});
			} finally {
				executing.value = false;
				closeDialog();
			}
		};

		return {
			showDialog,
			loading,
			executing,
			previewText,
			closeDialog,
			confirmUndo
		};
	}
});
</script>
