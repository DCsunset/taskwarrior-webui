<template>
	<v-app>
		<v-app-bar height="54px" fixed app>
			<v-toolbar-title>
				Taskwarrior WebUI
			</v-toolbar-title>
			<v-spacer />
			<v-icon class="mr-2" size="28px" @click="dark = !dark">
				{{ dark ? 'mdi-brightness-4' : 'mdi-brightness-7' }}
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
import { defineComponent, computed } from '@vue/composition-api';

export default defineComponent({
	setup(_props, context) {
		const dark = computed({
			get: () => context.root.$vuetify.theme.dark,
			set: val => {
				context.root.$vuetify.theme.dark = val;
			}
		});
		return {
			dark
		};
	}
});
</script>
