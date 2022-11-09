<template>
	<v-dialog
		v-model="showDialog"
		max-width="300px"
		@keydown.esc="handler('no')"
	>
		<v-card>
			<v-card-title>
				{{ title }}
			</v-card-title>
			<v-card-text>
				{{ text }}
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text color="primary" @click="handler('no')">No</v-btn>
				<v-btn text color="red" @click="handler('yes')">Yes</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, computed } from '@nuxtjs/composition-api';

export default defineComponent({
	props: {
		value: Boolean,
		title: {
			type: String,
			required: true
		},
		text: {
			type: String,
			required: true
		}
	},

	setup(props, context) {
		const showDialog = computed({
			get: () => props.value,
			set: val => context.emit('input', val)
		});

		const handler = (event: string) => {
			showDialog.value = false;
			context.emit(event);
		};

		return {
			showDialog,
			handler
		};
	}
});
</script>
