<template>
	<v-app class="task-app">
		<SettingsDialog v-model="settingsDialog" />
		<UndoDialog v-model="showUndoDialog" />
		<CommandBar ref="commandBarRef" />

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
			<v-toolbar-title class="mr-4">
				Taskwarrior WebUI
			</v-toolbar-title>
			<v-text-field
				id="cmdSearchBar"
				ref="searchInputRef"
				v-model="searchQuery"
				dense
				flat
				solo-inverted
				hide-details
				prepend-inner-icon="mdi-magnify"
				placeholder="Search bar (/)"
				style="max-width: 320px;"
				class="mx-2"
			/>
			<ActiveTaskBar v-if="timewPresent" />
			<v-spacer />

			<!-- Profile Selector (shown if more than 1 profile is configured) -->
			<v-menu v-if="profiles.length > 1" offset-y>
				<template v-slot:activator="{ on, attrs }">
					<v-btn
						text
						small
						class="mr-2 text-capitalize"
						v-bind="attrs"
						v-on="on"
					>
						<v-icon left small>mdi-account-switch</v-icon>
						{{ currentProfile }}
					</v-btn>
				</template>
				<v-list dense>
					<v-list-item
						v-for="prof in profiles"
						:key="prof"
						@click="handleSelectProfile(prof)"
					>
						<v-list-item-title :class="{ 'font-weight-bold primary--text': prof === currentProfile }">
							{{ prof }}
						</v-list-item-title>
					</v-list-item>
				</v-list>
			</v-menu>

			<!-- Context Selector (shown if contexts are defined) -->
			<v-menu v-if="contexts.length > 0" offset-y>
				<template v-slot:activator="{ on, attrs }">
					<v-btn
						text
						small
						class="mr-2 text-capitalize"
						v-bind="attrs"
						v-on="on"
					>
						<v-icon left small>mdi-tag-outline</v-icon>
						Context: {{ currentContext }}
					</v-btn>
				</template>
				<v-list dense>
					<v-list-item @click="handleSelectContext('none')">
						<v-list-item-title :class="{ 'font-weight-bold primary--text': currentContext === 'none' }">
							none (clear)
						</v-list-item-title>
					</v-list-item>
					<v-list-item
						v-for="ctxName in contexts"
						:key="ctxName"
						@click="handleSelectContext(ctxName)"
					>
						<v-list-item-title :class="{ 'font-weight-bold primary--text': ctxName === currentContext }">
							{{ ctxName }}
						</v-list-item-title>
					</v-list-item>
				</v-list>
			</v-menu>

			<v-icon
				class="mr-4"
				size="28px"
				title="Command Bar (Ctrl+Shift+K)"
				@click="triggerCommandBar"
			>
				mdi-console
			</v-icon>
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

		<v-main>
			<v-container fluid>
				<nuxt />
			</v-container>
		</v-main>
	</v-app>
</template>

<script lang="ts">
import { defineComponent, useContext, useStore, computed, onErrorCaptured, ref, onMounted, onUnmounted } from '@nuxtjs/composition-api';
import SettingsDialog from '../components/SettingsDialog.vue';
import ActiveTaskBar from '../components/ActiveTaskBar.vue';
import UndoDialog from '../components/UndoDialog.vue';
import CommandBar from '../components/CommandBar.vue';
import { HotkeyBus } from '../plugins/hotkeys';
import { accessorType  } from "../store";

export default defineComponent({
	setup(_props, ctx) {
		const context = useContext();
		const store = useStore<typeof accessorType>();
		store.dispatch('fetchSettings');
		store.dispatch('fetchHiddenColumns');
		store.dispatch('fetchTimewStatus');
		store.dispatch('fetchProfiles');
		store.dispatch('fetchContexts');

		context.$vuetify.theme.dark = store.state.settings.dark;

		const dark = computed({
			get: () => context.$vuetify.theme.dark,
			set: val => {
				context.$vuetify.theme.dark = val;
			}
		});

		const currentProfile = computed(() => store.state.currentProfile);
		const profiles = computed(() => store.state.profiles);
		const currentContext = computed(() => store.state.currentContext);
		const contexts = computed(() => store.state.contexts);

		const handleSelectProfile = (profile: string) => {
			store.dispatch('switchProfile', profile);
		};

		const handleSelectContext = (contextName: string) => {
			store.dispatch('switchContext', contextName);
		};

		const settingsDialog = ref(false);
		const showUndoDialog = ref(false);
		const searchQuery = ref('');
		const searchInputRef = ref<any>(null);

		const handleTriggerUndo = () => {
			showUndoDialog.value = true;
		};

		onMounted(() => {
			HotkeyBus.$on('trigger-undo', handleTriggerUndo);
		});

		onUnmounted(() => {
			HotkeyBus.$off('trigger-undo', handleTriggerUndo);
		});

		if (process.client) {
			window.addEventListener('keydown', (e: KeyboardEvent) => {
				const target = e.target as HTMLElement;
				const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

				if (e.key === '/' && !isInput) {
					e.preventDefault();
					if (searchInputRef.value && searchInputRef.value.focus) {
						searchInputRef.value.focus();
					}
				} else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
					e.preventDefault();
					triggerCommandBar();
				}
			});
		}

		const notification = computed(() => store.state.notification);
		const snackbar = computed({
			get: () => store.state.snackbar,
			set: val => store.commit('setSnackbar', val)
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
			store.commit('setNotification', notification);
			return false;
		});

		const triggerCommandBar = () => {
			HotkeyBus.$emit('trigger-command-bar');
		};

		return {
			dark,
			snackbar,
			notification,
			settingsDialog,
			showUndoDialog,
			timewPresent: computed(() => store.state.timewPresent),
			currentProfile,
			profiles,
			currentContext,
			contexts,
			handleSelectProfile,
			handleSelectContext,

			SettingsDialog,
			ActiveTaskBar,
			UndoDialog,
			CommandBar,
			searchQuery,
			searchInputRef,
			triggerCommandBar
		};
	}
});
</script>
