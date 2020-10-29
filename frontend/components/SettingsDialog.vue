<template>
	<v-dialog
		v-model="showDialog"
		max-width="400px"
		@keydown.esc="closeDialog"
	>
		<v-card>
			<v-card-title>
				Settings
			</v-card-title>
			<v-card-text>
				<v-form ref="formRef">
					<v-list-item>
						<v-list-item-content>
							<v-list-item-title>
								Dark
							</v-list-item-title>
							<v-list-item-subtitle>
								default theme
							</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action>
							<v-checkbox v-model="settings.dark" />
						</v-list-item-action>
					</v-list-item>

					<v-list-item>
						<v-list-item-content>
							<v-list-item-title>
								Auto Refresh
							</v-list-item-title>
							<v-list-item-subtitle>
								in minutes (0 means no refresh)
							</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action>
							<v-text-field
								v-model="settings.autoRefresh"
								style="width: 40px"
								:rules="numberRules"
							/>
						</v-list-item-action>
					</v-list-item>

					<v-list-item>
						<v-list-item-content>
							<v-list-item-title class="pb-1">
								Auto Sync
								<v-icon size="18px" class="ml-2" @click="sync" title="Sync immediately">
									mdi-sync
								</v-icon>
							</v-list-item-title>
							<v-list-item-subtitle>
								in minutes (0 means no auto sync)<br />
								run <code>task sync</code> periodically
							</v-list-item-subtitle>
						</v-list-item-content>
						<v-list-item-action>
							<v-text-field
								v-model="settings.autoSync"
								style="width: 40px"
								:rules="numberRules"
							/>
						</v-list-item-action>
					</v-list-item>
				</v-form>
			</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn text @click="closeDialog">
					Cancel
				</v-btn>
				<v-btn @click="reset">
					Reset
				</v-btn>
				<v-btn color="primary" @click="save">
					Save
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, computed, ref, reactive } from '@vue/composition-api';

export default defineComponent({
	props: {
		value: {
			type: Boolean,
			required: true
		}
	},

	setup(props, context) {
		const showDialog = computed({
			get: () => props.value,
			set: val => context.emit('input', val)
		});

		const numberRules = [
			(str: string) => (str && !isNaN(+str) && +str >= 0) || 'invalid'
		];

		const formRef = ref(null);
		const settings = reactive({
			dark: context.root.$store.state.settings.dark,
			autoRefresh: context.root.$store.state.settings.autoRefresh,
			autoSync: context.root.$store.state.settings.autoSync
		});

		const reset = () => {
			settings.dark = context.root.$store.state.settings.dark;
			settings.autoRefresh = context.root.$store.state.settings.autoRefresh;
			settings.autoSync = context.root.$store.state.settings.autoSync;
		};

		const closeDialog = () => {
			showDialog.value = false;
			reset();
		};

		const save = () => {
			const valid = (formRef as any).value.validate();
			if (valid) {
				context.root.$store.dispatch('updateSettings', {
					...settings
				});
				closeDialog();
			}
		};

		const sync = async () => {
			await context.root.$store.dispatch('syncTasks');
		};

		return {
			sync,
			showDialog,
			closeDialog,
			save,
			reset,
			settings,
			numberRules,
			formRef
		};
	}
});
</script>
