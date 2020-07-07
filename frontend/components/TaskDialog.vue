<template>
	<v-dialog v-model="showDialog" max-width="600px" persistent>
		<v-card>
			<v-card-title>
				{{ task ? 'Edit Task' : 'New Task' }}
			</v-card-title>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="cloesDialog">
					Cancel
				</v-btn>
				<v-btn color="primary" @click="submit">
					Submit
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, computed, reactive, ref } from '@vue/composition-api';
import { Task } from 'taskwarrior-lib';

interface Props {
	[key: string]: unknown,
	value: boolean,
	task?: Task;
}

export default defineComponent({
	props: {
		value: {
			type: Boolean,
			required: true
		},
		task: {
			type: Object,
			required: false
		}
	},
	setup(props: Props, context) {
		const showDialog = computed({
			get: () => props.value,
			set: val => context.emit('input', val)
		});
		const cloesDialog = () => {
			showDialog.value = false;
		};
		const submit = () => {
			// TODO: submit
			cloesDialog();
		};

		return {
			cloesDialog,
			submit,
			showDialog
		};
	}
});
</script>
