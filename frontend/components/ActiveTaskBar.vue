<template>
	<v-chip
		v-if="activeTask"
		color="success"
		dark
		class="ma-2 active-timer-chip"
	>
		<v-icon left small class="pulse-icon">
			mdi-play-circle-outline
		</v-icon>
		<span class="font-weight-bold mr-2">[ACTIVE]</span>
		<span class="text-truncate mr-2" style="max-width: 200px;">{{ activeTask.description }}</span>
		<v-chip x-small color="white" light class="font-weight-bold mr-2 black--text">
			{{ elapsedTimeDisplay }}
		</v-chip>
		<v-btn
			icon
			x-small
			dark
			title="Stop timer"
			@click="stopTimer"
		>
			<v-icon x-small>mdi-stop</v-icon>
		</v-btn>
	</v-chip>
</template>

<script lang="ts">
import { defineComponent, useStore, computed, ref, onMounted, onUnmounted, watch } from '@nuxtjs/composition-api';
import { accessorType } from '../store';
import { getActiveElapsedSeconds, formatDuration } from '../utils/duration';

export default defineComponent({
	name: 'ActiveTaskBar',
	setup() {
		const store = useStore<typeof accessorType>();
		const activeTask = computed(() => store.state.activeTask);
		const elapsedSeconds = ref(0);
		let timerInterval: any = null;

		const updateElapsed = () => {
			if (activeTask.value?.start) {
				elapsedSeconds.value = getActiveElapsedSeconds(activeTask.value.start);
			} else {
				elapsedSeconds.value = 0;
			}
		};

		watch(activeTask, () => {
			updateElapsed();
		}, { immediate: true });

		onMounted(() => {
			timerInterval = setInterval(() => {
				if (activeTask.value?.start) {
					elapsedSeconds.value++;
				}
			}, 1000);
		});

		onUnmounted(() => {
			if (timerInterval) clearInterval(timerInterval);
		});

		const elapsedTimeDisplay = computed(() => formatDuration(elapsedSeconds.value));

		const stopTimer = () => {
			if (activeTask.value?.uuid) {
				store.dispatch('stopTimer', activeTask.value.uuid);
			}
		};

		return {
			activeTask,
			elapsedTimeDisplay,
			stopTimer
		};
	}
});
</script>

<style scoped>
.active-timer-chip {
	animation: fadeIn 0.3s ease-in-out;
}
.pulse-icon {
	animation: pulse 1.5s infinite;
}
@keyframes pulse {
	0% { opacity: 1; transform: scale(1); }
	50% { opacity: 0.5; transform: scale(1.1); }
	100% { opacity: 1; transform: scale(1); }
}
</style>
