<template>
	<v-dialog
		v-model="showDialog"
		max-width="600px"
		persistent
		@keydown.esc="closeDialog"
	>
		<v-card>
			<v-card-title>
				{{ task ? 'Edit Task' : 'New Task' }}
			</v-card-title>
			<v-card-text>
				<v-form ref="formRef" lazy-validation>
					<v-text-field
						autofocus
						v-model="formData.description"
						label="Description*"
						:rules="requiredRules"
						required
					/>
					<v-combobox
						v-model="formData.project"
						:items="projects"
						hide-selected
						label="Project"
					/>
					<v-combobox
						v-model="formData.tags"
						:items="tags"
						hide-selected
						small-chips
						multiple
						label="Tags"
						hint="Press tab or enter to add new tags"
					/>
					<v-row class="px-3">
						<v-text-field
							class="mr-3"
							v-model="formData.due"
							:label="recur ? 'Due*' : 'Due'"
							:rules="recur ? requiredRules : []"
							:required="recur"
						/>
						<v-text-field
							v-model="formData.until"
							label="Until"
						/>
					</v-row>
					<v-row class="px-3">
						<v-text-field
							class="mr-3"
							v-model="formData.scheduled"
							label="Scheduled"
						/>
						<v-text-field
							v-model="formData.wait"
							label="Wait"
						/>
					</v-row>
					<v-row class="px-3">
						<v-checkbox v-model="recur" class="mr-3" label="Recur" />
						<v-text-field
							label="period*"
							v-model="formData.recur"
							:rules="recur ? requiredRules : []"
							:required="recur"
							:disabled="!recur"
						/>
					</v-row>
					<v-radio-group v-model="formData.priority" row hide-details class="align-center">
						<template v-slot:prepend>
							<span class="mr-3 subtitle-1">
								Priority
							</span>
						</template>
						<v-radio
							v-for="p in priorities"
							:key="p.text"
							:label="p.text"
							:value="p.value"
						/>
					</v-radio-group>

					<v-list subheader dense flat>
						<v-subheader>Annotations</v-subheader>
						<v-list-item>
							<v-list-item-content>
								<v-text-field
									placeholder="Annotation text"
									v-model="addAnnotationDescription"
								/>
							</v-list-item-content>
							<v-list-item-action>
								<v-btn
									class="primary ml-1"
									fab
									dark
									x-small
									title="Add annotation"
									@click="addAnnotation"
								>
									<v-icon>mdi-plus</v-icon>
								</v-btn>
							</v-list-item-action>
						</v-list-item>
						<v-list-item v-for="a in formData.annotations" :key="a.entry">
							<v-list-item-content>
								<v-list-item-title v-text="a.description"></v-list-item-title>
								<v-list-item-subtitle v-text="a.entry"></v-list-item-subtitle>
							</v-list-item-content>
						</v-list-item>
					</v-list>
				</v-form>
			</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn text @click="closeDialog" width="80px">
					Cancel
				</v-btn>
				<v-btn @click="reset" width="80px">
					Reset
				</v-btn>
				<v-btn color="primary" @click="submit" width="80px">
					Submit
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, watch, computed, ref } from '@vue/composition-api';
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
		const projects = computed(() => context.root.$store.getters.projects);
		const tags = computed(() => context.root.$store.getters.tags);

		const showDialog = computed({
			get: () => props.value,
			set: val => context.emit('input', val)
		});

		const requiredRules = [
			(str: string) => Boolean(str) || 'Required'
		];

		const addAnnotationDescription = ref('');

		const recur = ref(Boolean(props.task?.recur));
		const formData = ref({
			description: '',
			project: '',
			scheduled: '',
			due: '',
			until: '',
			wait: '',
			tags: [] as string[],
			annotations: [] as {entry: string; description: string}[],
			priority: 'N',
			recur: '',
			...props.task
		});

		const reset = () => {
			formData.value = {
				description: '',
				project: '',
				scheduled: '',
				due: '',
				until: '',
				wait: '',
				tags: [] as string[],
				annotations: [] as {entry: string; description: string}[],
				priority: 'N',
				recur: '',
				...props.task
			};
			recur.value = Boolean(props.task?.recur);
			if (formRef.value) {
				(formRef.value as any).resetValidation();
			}

			addAnnotationDescription.value = "";
		};

		watch(() => props.task, () => {
			reset();
		});

		const formRef = ref(null);

		const addAnnotation = () => {
			formData.value.annotations.push({
				entry: new Date().toISOString(),
				description: addAnnotationDescription.value
			});

			addAnnotationDescription.value = "";
		};

		const closeDialog = () => {
			showDialog.value = false;
			reset();
		};
		const submit = async () => {
			const valid = (formRef.value as any).validate();
			if (valid) {
				await context.root.$store.dispatch('updateTasks', [{
					...formData.value,
					annotations: formData.value.annotations || [],
					project: formData.value.project || undefined,
					scheduled: formData.value.scheduled || undefined,
					due: formData.value.due || undefined,
					until: formData.value.until || undefined,
					wait: formData.value.wait || undefined,
					priority: formData.value.priority === 'N' ? undefined : formData.value.priority,
					recur: recur.value ? formData.value.recur : undefined
				}]);
				context.root.$store.commit('setNotification', {
					color: 'success',
					text: `Successfully ${props.task ? 'update' : 'create'} the task`
				});
				closeDialog();
			}
		};

		const priorities = [
			{ text: 'None', value: 'N' },
			{ text: 'Low', value: 'L' },
			{ text: 'Medium', value: 'M' },
			{ text: 'High', value: 'H' }
		];

		return {
			requiredRules,
			formRef,
			tags,
			projects,
			priorities,
			recur,
			formData,
			addAnnotationDescription,
			addAnnotation,
			closeDialog,
			reset,
			submit,
			showDialog
		};
	}
});
</script>
