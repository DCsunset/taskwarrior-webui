<template>
	<div class="pa-4">
		<v-row class="mb-4">
			<v-col cols="12">
				<h2 class="headline font-weight-bold d-flex align-center">
					<v-icon left color="primary">mdi-chart-bell-curve-cumulative</v-icon>
					Project Progress & Analytics Reports
				</h2>
			</v-col>
		</v-row>

		<v-row v-if="loading">
			<v-col cols="12" class="text-center py-6">
				<v-progress-circular indeterminate color="primary" size="48" />
			</v-col>
		</v-row>

		<v-row v-else>
			<v-col v-for="proj in projectReports" :key="proj.name" cols="12" sm="6" md="4">
				<v-card class="pa-4 elevation-2 rounded-lg">
					<v-card-title class="subtitle-1 font-weight-bold py-1">
						<v-icon left small color="primary">mdi-folder-outline</v-icon>
						{{ proj.name }}
					</v-card-title>
					<v-card-text class="py-3 text-center">
						<v-progress-circular
							:size="90"
							:width="9"
							:value="proj.progress"
							color="primary"
							class="my-2"
						>
							<span class="caption font-weight-bold">{{ proj.progress }}%</span>
						</v-progress-circular>
						<div class="mt-2 caption text--secondary">
							<span>{{ proj.completed }} completed</span> / <span>{{ proj.total }} total</span>
						</div>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
	</div>
</template>

<script lang="ts">
import { defineComponent, useStore, ref, onMounted } from '@nuxtjs/composition-api';

interface ProjectReport {
	name: string;
	completed: number;
	pending: number;
	total: number;
	progress: number;
}

export default defineComponent({
	name: 'ReportsView',
	setup() {
		const store = useStore();
		const loading = ref(false);
		const projectReports = ref<ProjectReport[]>([]);

		const fetchReports = async () => {
			loading.value = true;
			try {
				const res: any = await (store as any).$axios.$get('/api/reports/projects');
				projectReports.value = res || [];
			} catch (e) {
				projectReports.value = [];
			} finally {
				loading.value = false;
			}
		};

		onMounted(fetchReports);

		return {
			loading,
			projectReports
		};
	}
});
</script>
