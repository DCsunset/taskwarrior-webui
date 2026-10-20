<template>
	<v-dialog
		v-model="showDialog"
		max-width="600px"
		persistent
		@keydown.esc="closeDialog"
	>
		<v-card>
			<v-card-title class="d-flex align-center">
				<span>{{ task ? 'Edit Task' : 'New Task' }}</span>
				<v-spacer />
				<template v-if="task">
					<v-chip small color="primary" class="mr-2 font-weight-bold" outlined>
						<span v-if="task.id !== 0 && task.id !== undefined && task.id !== null">#{{ task.id }}</span>
						<span v-else>#-</span>
					</v-chip>
					<v-chip small color="grey" dark outlined :title="task.uuid">
						{{ task.uuid ? task.uuid.substring(0, 8) : '' }}
					</v-chip>
				</template>
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
						v-model="formData.assignee"
						:items="assignees"
						hide-selected
						label="Assignee"
					/>
					<v-combobox
						v-model="formData.depends"
						:items="availableTaskOptions"
						hide-selected
						small-chips
						multiple
						label="Dependencies (Blocked by)"
						hint="Select tasks this task depends on"
					/>
					<v-combobox
						v-model="formData.dependents"
						:items="availableTaskOptions"
						hide-selected
						small-chips
						multiple
						label="Dependents (Blocking)"
						hint="Select tasks that depend on this task"
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

					<v-text-field
						v-model="formData.customCommand"
						label="Free-form Taskwarrior Modifiers"
						placeholder="e.g. depends:123 priority:H due:tomorrow"
						hint="Pass direct task modifier command fragments"
						persistent-hint
						class="mb-3"
					/>
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
								<v-list-item-title v-text="a.description" class="text-wrap"></v-list-item-title>
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
import { defineComponent, useStore, watch, computed, ref } from '@nuxtjs/composition-api';
import { Task } from 'taskwarrior-lib';
import { accessorType  } from "../store";

export default defineComponent({
	props: {
		value: Boolean,
		task: {
			type: Object as () => Task,
			required: false
		}
	},
	setup(props, ctx) {
		const store = useStore<typeof accessorType>();

		const projects = computed(() => store.getters.projects);
		const tags = computed(() => store.getters.tags);
		const assignees = computed(() => store.getters.assignees);

		const showDialog = computed({
			get: () => props.value,
			set: val => ctx.emit('input', val)
		});

		const requiredRules = [
			(str: string) => Boolean(str) || 'Required'
		];

		const addAnnotationDescription = ref('');

		const allTasks = computed(() => store.state.tasks || []);

		const availableTaskOptions = computed(() => {
			return allTasks.value
				.filter(t => !props.task || t.uuid !== props.task.uuid)
				.map(t => {
					const idStr = (t.id !== undefined && t.id !== null && t.id !== 0) ? `#${t.id}` : (t.uuid ? t.uuid.substring(0, 8) : '');
					return `${idStr}: ${t.description}`;
				});
		});

		const parseTaskRefToUuid = (refStr: string): string => {
			const trimmed = refStr.trim();
			// Match #id or uuid or id: description format
			const idMatch = trimmed.match(/^#?(\d+)/);
			if (idMatch) {
				const numericId = parseInt(idMatch[1], 10);
				const found = allTasks.value.find(t => t.id === numericId);
				if (found && found.uuid) return found.uuid;
			}
			const uuidMatch = trimmed.match(/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})/i) || trimmed.match(/^([a-f0-9]{8})/i);
			if (uuidMatch) {
				const sub = uuidMatch[1].toLowerCase();
				const found = allTasks.value.find(t => t.uuid && t.uuid.toLowerCase().startsWith(sub));
				if (found && found.uuid) return found.uuid;
			}
			return trimmed;
		};

		const getInitialDepends = (): string[] => {
			if (!props.task || !props.task.depends) return [];
			const rawList = Array.isArray(props.task.depends) ? props.task.depends : String(props.task.depends).split(',').map(s => s.trim());
			return rawList.map(dep => {
				const found = allTasks.value.find(t => t.uuid === dep || (t.uuid && t.uuid.startsWith(dep)));
				if (found) {
					const idStr = (found.id !== undefined && found.id !== null && found.id !== 0) ? `#${found.id}` : (found.uuid ? found.uuid.substring(0, 8) : '');
					return `${idStr}: ${found.description}`;
				}
				return dep;
			});
		};

		const getInitialDependents = (): string[] => {
			if (!props.task || !props.task.uuid) return [];
			const currentUuid = props.task.uuid;
			const dependents: string[] = [];
			for (const t of allTasks.value) {
				if (t.depends) {
					const rawList = Array.isArray(t.depends) ? t.depends : String(t.depends).split(',').map(s => s.trim());
					if (rawList.includes(currentUuid)) {
						const idStr = (t.id !== undefined && t.id !== null && t.id !== 0) ? `#${t.id}` : (t.uuid ? t.uuid.substring(0, 8) : '');
						dependents.push(`${idStr}: ${t.description}`);
					}
				}
			}
			return dependents;
		};

		const recur = ref(Boolean(props.task?.recur));
		const formData = ref({
			description: '',
			project: '',
			assignee: (props.task as any)?.assignee || (props.task as any)?.assignees || '',
			scheduled: '',
			due: '',
			until: '',
			wait: '',
			tags: [] as string[],
			depends: getInitialDepends(),
			dependents: getInitialDependents(),
			annotations: [] as {entry: string; description: string}[],
			priority: 'N',
			recur: '',
			customCommand: '',
			...props.task
		});

		const reset = () => {
			formData.value = {
				description: '',
				project: '',
				assignee: (props.task as any)?.assignee || (props.task as any)?.assignees || '',
				scheduled: '',
				due: '',
				until: '',
				wait: '',
				tags: [] as string[],
				depends: getInitialDepends(),
				dependents: getInitialDependents(),
				annotations: [] as {entry: string; description: string}[],
				priority: 'N',
				recur: '',
				customCommand: '',
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
				const dependsUuids = (formData.value.depends || []).map(parseTaskRefToUuid).filter(Boolean);

				const taskPayload = {
					...formData.value,
					depends: dependsUuids.length > 0 ? dependsUuids.join(',') : undefined,
					annotations: formData.value.annotations || [],
					project: formData.value.project || undefined,
					scheduled: formData.value.scheduled || undefined,
					due: formData.value.due || undefined,
					until: formData.value.until || undefined,
					wait: formData.value.wait || undefined,
					priority: formData.value.priority === 'N' ? undefined : formData.value.priority,
					recur: recur.value ? formData.value.recur : undefined
				};
				delete (taskPayload as any).dependents;

				await store.dispatch('updateTasks', [taskPayload]);

				// Handle dependents update (tasks that list this task in their `depends`)
				if (props.task?.uuid) {
					const currentUuid = props.task.uuid;
					const newDependentUuids = new Set((formData.value.dependents || []).map(parseTaskRefToUuid).filter(Boolean));
					const initialDependentUuids = new Set(getInitialDependents().map(parseTaskRefToUuid));

					// Add dependency to tasks newly added as dependents
					for (const depUuid of newDependentUuids) {
						if (!initialDependentUuids.has(depUuid)) {
							try {
								await (store as any).$axios.$post('/api/tasks/' + depUuid + '/modify', {
									command: `depends:${currentUuid}`
								});
							} catch (e) {
								console.error(`Error adding dependency to task ${depUuid}`, e);
							}
						}
					}

					// Remove dependency from tasks removed as dependents
					for (const depUuid of initialDependentUuids) {
						if (!newDependentUuids.has(depUuid)) {
							try {
								await (store as any).$axios.$post('/api/tasks/' + depUuid + '/modify', {
									command: `depends:-${currentUuid}`
								});
							} catch (e) {
								console.error(`Error removing dependency from task ${depUuid}`, e);
							}
						}
					}
				}

				if (formData.value.customCommand && props.task?.uuid) {
					try {
						await (store as any).$axios.$post('/api/tasks/' + props.task.uuid + '/modify', {
							command: formData.value.customCommand
						});
					} catch (e) {
						console.error('Custom modifier command error', e);
					}
				}

				await store.dispatch('fetchTasks');

				store.commit('setNotification', {
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

		const getTaskId = (t: any) => {
			if (t && t.id !== undefined && t.id !== null && t.id !== '') return t.id;
			return '-';
		};

		const getShortUuid = (t: any) => {
			return (t && t.uuid) ? t.uuid.substring(0, 8) : '';
		};

		return {
			availableTaskOptions,
			getTaskId,
			getShortUuid,
			requiredRules,
			formRef,
			tags,
			projects,
			assignees,
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
