<template>
	<v-dialog v-model="showDialog" max-width="550px">
		<v-card>
			<v-card-title class="headline d-flex align-center">
				<v-icon left color="primary">mdi-text-search</v-icon>
				Custom Queries
			</v-card-title>
			<v-card-text>
				<p class="body-2 text--secondary">
					Select a custom query to filter your task list or press the assigned mnemonic shortcut key.
				</p>
				<v-list dense class="elevation-1 rounded">
					<v-list-item
						v-for="(queryObj, key) in customQueries"
						:key="key"
						button
						@click="selectQuery(queryObj)"
					>
						<v-list-item-avatar size="24" class="my-0 mr-3">
							<span class="query-mnemonic-badge">{{ queryObj.fixed_key || key.substring(0, 2) }}</span>
						</v-list-item-avatar>
						<v-list-item-content>
							<v-list-item-title class="font-weight-medium">{{ queryObj.description || key }}</v-list-item-title>
							<v-list-item-subtitle class="caption grey--text">{{ queryObj.query }}</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action>
							<v-icon small color="primary">mdi-arrow-right</v-icon>
						</v-list-item-action>
					</v-list-item>
					<v-list-item v-if="Object.keys(customQueries).length === 0">
						<v-list-item-content>
							<v-list-item-subtitle class="text-center italic">No custom queries configured in backend environment.</v-list-item-subtitle>
						</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="closeDialog" width="80px">Close</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, useStore, computed, ref, watch } from '@nuxtjs/composition-api';

export interface CustomQuery {
	query: string;
	description: string;
	fixed_key?: string;
}

export default defineComponent({
	name: 'CustomQueryBar',
	props: {
		value: Boolean
	},
	setup(props, ctx) {
		const store = useStore();
		const customQueries = ref<Record<string, CustomQuery>>({});

		const showDialog = computed({
			get: () => props.value,
			set: val => ctx.emit('input', val)
		});

		const fetchQueries = async () => {
			try {
				const res = await (store as any).$axios.$get('/api/config/queries');
				customQueries.value = res || {};
			} catch (e) {
				customQueries.value = {};
			}
		};

		watch(showDialog, (val) => {
			if (val) fetchQueries();
		});

		const closeDialog = () => {
			showDialog.value = false;
		};

		const selectQuery = (queryObj: CustomQuery) => {
			ctx.emit('select-query', queryObj);
			closeDialog();
		};

		return {
			showDialog,
			customQueries,
			closeDialog,
			selectQuery
		};
	}
});
</script>

<style scoped>
.query-mnemonic-badge {
	display: inline-block;
	background-color: #e53935;
	color: #ffffff;
	font-weight: bold;
	font-size: 0.75rem;
	padding: 1px 6px;
	border-radius: 3px;
	text-transform: lowercase;
	font-family: monospace;
}
</style>
