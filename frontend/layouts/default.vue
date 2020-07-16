<template>
	<v-app>
		<SettingsDialog v-model="settingsDialog" />

		<v-snackbar
			v-model="snackbar"
			:color="notification.color"
			:timeout="4000"
		>
			{{ notification.text }}

			<template v-slot:action="{ attrs }">
				<v-btn
					dark
					text
					v-bind="attrs"
					@click="snackbar = false"
				>
					Close
				</v-btn>
			</template>
		</v-snackbar>

		<v-app-bar height="54px" fixed app>
			<v-icon class="mr-2" color="blue">
				mdi-sticker-check-outline
			</v-icon>
			<v-toolbar-title>
				Taskwarrior WebUI
			</v-toolbar-title>
			<v-spacer />
			<v-icon class="mr-4" size="28px" @click="dark = !dark" title="Theme">
				{{ dark ? 'mdi-brightness-4' : 'mdi-brightness-7' }}
			</v-icon>
			<v-icon
				class="mr-2"
				size="28px"
				title="Settings"
				@click="settingsDialog = true"
			>
				mdi-cog
			</v-icon>
		</v-app-bar>

		<v-content>
			<v-container fluid>
				<nuxt />
			</v-container>
		</v-content>
	</v-app>
</template>

<script lang="ts">
import { defineComponent, computed, onErrorCaptured, ref } from '@vue/composition-api';
import SettingsDialog from '../components/SettingsDialog.vue';

export default defineComponent({
	setup(_props, context) {
		context.root.$store.dispatch('fetchSettings');

		context.root.$vuetify.theme.dark = context.root.$store.state.settings.dark;

		const dark = computed({
			get: () => context.root.$vuetify.theme.dark,
			set: val => {
				context.root.$vuetify.theme.dark = val;
			}
		});

		const settingsDialog = ref(false);

		const notification = computed(() => context.root.$store.state.notification);
		const snackbar = computed({
			get: () => context.root.$store.state.snackbar,
			set: val => context.root.$store.commit('setSnackbar', val)
		});

		onErrorCaptured((err: any) => {
			// axios error
			let notification: any;
			if (err?.response) {
				const { status, data } = err.response!;
				notification = {
					color: 'error',
					text: `Error ${status}: ${data}`
				};
			}
			else {
				const { name, message } = err as Error;
				notification = {
					color: 'error',
					text: `Error ${name}: ${message}`
				};
			}
			context.root.$store.commit('setNotification', notification);
			return false;
		});

		return {
			dark,
			snackbar,
			notification,
			settingsDialog,

			SettingsDialog
		};
	}
});
</script>
