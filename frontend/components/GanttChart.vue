<template>
	<div class="gantt-chart-container pa-4" @mousemove="onMouseMove" @mouseup="onMouseUp">
		<!-- Gantt Controls Header -->
		<v-card class="mb-4 pa-3 elevation-2" :color="$vuetify.theme.dark ? '#333333' : 'white'">
			<div class="d-flex align-center flex-wrap">
				<div class="subtitle-1 font-weight-bold d-flex align-center mr-4">
					<v-icon left color="primary">mdi-chart-gantt</v-icon>
					Gantt Timeline
				</div>
				<!-- Item 1: Zoom Chip Group with Sync -->
				<v-chip-group :value="selectedZoomIndex" @change="onZoomChange" active-class="primary--text" mandatory class="mr-4">
					<v-chip v-for="z in zoomOptions" :key="z" small label outline>
						{{ z }}
					</v-chip>
				</v-chip-group>
				<!-- Reused status toggles matching TaskList -->
				<v-btn-toggle v-model="selectedStatuses" multiple background-color="rgba(0, 0, 0, 0)" class="mr-4">
					<v-btn
						v-for="st in allStatus"
						:key="st"
						:value="st"
						:color="selectedStatuses.includes(st) ? 'primary' : undefined"
						text
						small
					>
						<v-icon
							small
							class="mr-1"
							:color="selectedStatuses.includes(st) ? 'primary' : undefined"
						>
							{{ statusIcons[st] }}
						</v-icon>
						{{ st }}
						<v-badge
							v-if="st === 'pending' && ((classifiedTasks[st] && classifiedTasks[st].length) || (classifiedTasks[st] && classifiedTasks[st].value && classifiedTasks[st].value.length))"
							:content="classifiedTasks[st].length || (classifiedTasks[st].value && classifiedTasks[st].value.length)"
							:color="selectedStatuses.includes(st) ? 'primary' : 'grey'"
							inline
						/>
					</v-btn>
				</v-btn-toggle>
				<v-spacer />
				<div class="caption text--secondary mr-2">
					<span class="mr-3"><v-icon small color="blue">mdi-square</v-icon> Pending</span>
					<span class="mr-3"><v-icon small color="orange">mdi-square</v-icon> In Progress</span>
					<span class="mr-3"><v-icon small color="green">mdi-square</v-icon> Completed</span>
				</div>
			</div>
		</v-card>

		<!-- Main Gantt View Canvas -->
		<v-card class="gantt-canvas-card elevation-2" :color="$vuetify.theme.dark ? '#1e1e1e' : 'white'">
			<div class="gantt-wrapper" ref="ganttWrapper">
				<!-- Left Task Table Sidebar -->
				<div class="gantt-sidebar" :style="{ width: sidebarWidth + 'px' }">
					<div class="sidebar-header px-3 py-2 font-weight-bold caption border-bottom">
						Task Description
					</div>
					<div
						v-for="item in processedTasks"
						:key="item.task.uuid"
						class="sidebar-row px-3 d-flex align-center border-bottom text-truncate"
						:style="{ height: rowHeight + 'px' }"
						@click="handleTaskClick(item.task)"
					>
						<v-chip
							x-small
							label
							class="mr-2 px-1"
							:color="getPriorityColor(item.task.priority)"
							dark
							v-if="item.task.priority"
						>
							{{ item.task.priority }}
						</v-chip>
						<span class="caption text-truncate font-weight-medium" :title="item.task.description">
							{{ item.task.description }}
						</span>
					</div>
				</div>

				<!-- Right SVG Timeline Container -->
				<div class="gantt-timeline-container" ref="timelineContainer" @click="onBackgroundClick">
					<div class="gantt-svg-wrapper" :style="{ width: totalTimelineWidth + 'px' }">
						<!-- Timeline Header -->
						<div class="timeline-header d-flex border-bottom" :style="{ height: headerHeight + 'px' }">
							<div :style="{ width: timelinePaddingLeft + 'px', flexShrink: 0 }"></div>
							<div
								v-for="(col, idx) in timelineColumns"
								:key="idx"
								class="timeline-header-col caption text-center border-right py-1 text-truncate"
								:style="{ width: colWidth + 'px' }"
							>
								<div>{{ col.title }}</div>
								<div class="caption grey--text">{{ col.subtitle }}</div>
							</div>
						</div>

						<!-- Timeline Grid Body & SVG Layer -->
						<div class="timeline-body" :style="{ height: (processedTasks.length * rowHeight) + 'px' }">
							<!-- Background Column Lines -->
							<div class="grid-background d-flex">
								<div :style="{ width: timelinePaddingLeft + 'px', flexShrink: 0 }"></div>
								<div
									v-for="(col, idx) in timelineColumns"
									:key="idx"
									class="grid-col border-right"
									:style="{ width: colWidth + 'px', height: (processedTasks.length * rowHeight) + 'px' }"
								></div>
							</div>

							<!-- SVG Layer for Dependencies & Line Crossings -->
							<svg
								class="gantt-svg-layer"
								:width="totalTimelineWidth"
								:height="processedTasks.length * rowHeight"
							>
								<defs>
									<marker
										id="arrow-end"
										viewBox="0 0 10 10"
										refX="8"
										refY="5"
										markerWidth="6"
										markerHeight="6"
										orient="auto-start-reverse"
									>
										<path d="M 0 0 L 10 5 L 0 10 z" fill="#1976D2" />
									</marker>
									<marker
										id="arrow-end-hover"
										viewBox="0 0 10 10"
										refX="8"
										refY="5"
										markerWidth="6"
										markerHeight="6"
										orient="auto-start-reverse"
									>
										<path d="M 0 0 L 10 5 L 0 10 z" fill="#FF5252" />
									</marker>
								</defs>

								<!-- Rendered Dependency Arrow Lines with Line Crossing Bridges -->
								<g
									v-for="link in dependencyLinks"
									:key="link.id"
									class="dep-link-group"
									@mouseenter="onLinkMouseEnter(link.id)"
									@mouseleave="onLinkMouseLeave(link.id)"
								>
									<!-- Wide hit area to prevent flicker -->
									<path
										:d="link.path"
										fill="none"
										stroke="transparent"
										stroke-width="16"
										class="hit-path"
									/>
									<!-- Visible Arrow Path with line-crossing bridge hops -->
									<path
										:d="link.path"
										fill="none"
										:stroke="hoveredLinkId === link.id ? '#FF5252' : '#1976D2'"
										stroke-width="2.5"
										:marker-end="hoveredLinkId === link.id ? 'url(#arrow-end-hover)' : 'url(#arrow-end)'"
										class="visible-path"
									/>
									<!-- Stable "X" Delete Button on Midpoint -->
									<g
										v-if="hoveredLinkId === link.id"
										:transform="`translate(${link.midX}, ${link.midY})`"
										class="dep-delete-btn"
										@click.stop="handleRemoveDependency(link)"
									>
										<circle r="10" fill="#FF5252" stroke="#ffffff" stroke-width="1.5" />
										<text
											x="0"
											y="3.5"
											text-anchor="middle"
											fill="white"
											font-size="11"
											font-weight="bold"
										>×</text>
									</g>
								</g>

								<!-- Active Drag Line when connecting anchors -->
								<path
									v-if="linkingSourceItem"
									:d="dragLinePath"
									fill="none"
									stroke="#4CAF50"
									stroke-width="2.5"
									stroke-dasharray="4 2"
									marker-end="url(#arrow-end)"
								/>
							</svg>

							<!-- Task Bars Layer with Left/Right Anchor Handles -->
							<div
								v-for="(item, idx) in processedTasks"
								:key="item.task.uuid"
								class="task-row-layer"
								:style="{ top: (idx * rowHeight) + 'px', height: rowHeight + 'px' }"
							>
								<!-- Left Anchor Handle (Beginning of Task) -->
								<div
									class="gantt-anchor anchor-left"
									:class="{
										'anchor-highlight': isTargetAnchor(item, 'left'),
										'anchor-active': linkingSourceItem && linkingSourceItem.task.uuid === item.task.uuid && linkingSourceSide === 'left'
									}"
									:style="{ left: (item.barLeft - 6) + 'px', top: (rowHeight / 2 - 6) + 'px' }"
									title="Left Anchor (Click to connect dependency)"
									@mousedown.stop="onAnchorMouseDown(item, 'left', $event)"
									@mouseup.stop="onAnchorMouseUp(item, 'left')"
									@click.stop="onAnchorClick(item, 'left')"
								></div>

								<!-- Task Bar -->
								<v-tooltip bottom>
									<template v-slot:activator="{ on, attrs }">
										<div
											class="gantt-task-bar"
											v-bind="attrs"
											v-on="on"
											:style="getTaskBarStyle(item)"
											@click="handleTaskClick(item.task)"
										>
											<span class="bar-title caption text-truncate px-2">
												{{ item.task.description }}
											</span>
										</div>
									</template>
									<div>
										<strong>{{ item.task.description }}</strong><br />
										Status: {{ item.task.status }}<br />
										Start: {{ formatDate(item.startDate) }}<br />
										End: {{ formatDate(item.endDate) }}<br />
										<span v-if="item.task.project">Project: {{ item.task.project }}<br /></span>
										<span v-if="item.task.depends">Depends on: {{ item.task.depends }}</span>
									</div>
								</v-tooltip>

								<!-- Right Anchor Handle (End of Task) -->
								<div
									class="gantt-anchor anchor-right"
									:class="{
										'anchor-highlight': isTargetAnchor(item, 'right'),
										'anchor-active': linkingSourceItem && linkingSourceItem.task.uuid === item.task.uuid && linkingSourceSide === 'right'
									}"
									:style="{ left: (item.barLeft + item.barWidth - 6) + 'px', top: (rowHeight / 2 - 6) + 'px' }"
									title="Right Anchor (Click to connect dependency)"
									@mousedown.stop="onAnchorMouseDown(item, 'right', $event)"
									@mouseup.stop="onAnchorMouseUp(item, 'right')"
									@click.stop="onAnchorClick(item, 'right')"
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</v-card>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, useRoute, useRouter, reactive, ComputedRef } from '@nuxtjs/composition-api';
import { Task } from 'taskwarrior-lib';
import moment from 'moment';

function expiredDate(str?: string) {
	if (!str)
		return false;

	const date = moment(str);
	return date.isBefore(moment());
}

function futureDate(str?: string) {
	if (!str)
		return false;

	const date = moment(str);
	return date.isAfter(moment());
}

interface ProcessedTask {
	task: Task;
	startDate: Date;
	endDate: Date;
	leftPx: number;
	widthPx: number;
	barLeft: number;
	barWidth: number;
	rowIndex: number;
}

interface DependencyLink {
	id: string;
	sourceTask: Task;
	targetTask: Task;
	path: string;
	midX: number;
	midY: number;
}

export default defineComponent({
	name: 'GanttChart',
	props: {
		tasks: {
			type: Array as () => Task[],
			required: true
		},
		activeTaskUuid: {
			type: String,
			default: ''
		},
		zoom: {
			type: String,
			default: 'Day'
		}
	},
	setup(props, ctx) {
		const sidebarWidth = 260;
		const rowHeight = 40;
		const headerHeight = 44;
		const timelinePaddingLeft = 40;

		const timelineContainer = ref<HTMLElement | null>(null);

		const zoomOptions = ['Sequence', 'Day', 'Week', 'Month'];
		const selectedZoomIndex = computed(() => {
			const idx = zoomOptions.indexOf(props.zoom);
			return idx >= 0 ? idx : 1; // Default to 'Day'
		});

		const onZoomChange = (idx: number) => {
			if (idx >= 0 && idx < zoomOptions.length) {
				ctx.emit('update:zoom', zoomOptions[idx]);
			}
		};

		const route = useRoute();
		const router = useRouter();

		const allStatus = ['pending', 'waiting', 'completed', 'deleted', 'recurring'];
		const statusIcons: { [st: string]: string } = {
			pending: 'mdi-clock-outline',
			waiting: 'mdi-pause',
			completed: 'mdi-check',
			deleted: 'mdi-delete',
			recurring: 'mdi-restart'
		};

		const parseStatusQuery = (queryVal: any): string[] => {
			if (queryVal === undefined || queryVal === null) {
				return ['pending'];
			}
			const str = String(queryVal).trim().toLowerCase();
			if (!str || str === 'none') {
				return [];
			}
			if (str === 'all') {
				return [...allStatus];
			}
			const parts = str.split(',').map(s => s.trim().toLowerCase()).filter(s => allStatus.includes(s));
			return parts;
		};

		const selectedStatuses = ref<string[]>(parseStatusQuery(route.value.query.status));

		const updateStatusQuery = (statuses: string[]) => {
			const currentQueryStatus = (route.value.query.status as string) || '';
			const sorted = [...statuses].sort((a, b) => allStatus.indexOf(a) - allStatus.indexOf(b));
			let serialized = '';
			if (sorted.length === 0) {
				serialized = 'none';
			}
			else {
				serialized = sorted.join(',');
			}

			if (currentQueryStatus !== serialized) {
				const query: Record<string, string> = { ...(route.value.query as Record<string, string>) };
				if (serialized === 'pending' && !currentQueryStatus) {
					return;
				}
				query.status = serialized;
				router.replace({ query }).catch(() => {});
			}
		};

		const tempTasks: { [key: string]: ComputedRef<Task[]> } = {};
		for (const status of allStatus) {
			tempTasks[status] = computed((): Task[] => (props.tasks || []).filter(task => {
				if (status === 'waiting' || status === 'pending') {
					const waiting = (task.wait && !expiredDate(task.wait))
						|| (task.scheduled && futureDate(task.scheduled));
					return task.status === 'pending' && (status === 'pending' ? !waiting : waiting);
				}
				else if (status === 'pending') {
					return task.status === 'pending' && !(task.wait && !expiredDate(task.wait));
				}
				else {
					return task.status === status;
				}
			}));
		}
		const classifiedTasks = reactive(tempTasks);

		watch(selectedStatuses, (newStatuses) => {
			updateStatusQuery(newStatuses);
		});

		watch(() => route.value.query.status, (newStatus) => {
			const parsed = parseStatusQuery(newStatus);
			const curSorted = [...selectedStatuses.value].sort().join(',');
			const newSorted = [...parsed].sort().join(',');
			if (curSorted !== newSorted) {
				selectedStatuses.value = parsed;
			}
		});

		// Item 2: Debounced hover state for stable delete button
		const hoveredLinkId = ref<string | null>(null);
		let hoverTimer: any = null;

		const onLinkMouseEnter = (linkId: string) => {
			if (hoverTimer) clearTimeout(hoverTimer);
			hoveredLinkId.value = linkId;
		};

		const onLinkMouseLeave = (linkId: string) => {
			if (hoverTimer) clearTimeout(hoverTimer);
			hoverTimer = setTimeout(() => {
				if (hoveredLinkId.value === linkId) {
					hoveredLinkId.value = null;
				}
			}, 150);
		};

		// Bidirectional Anchor dragging & linking state
		const linkingSourceItem = ref<ProcessedTask | null>(null);
		const linkingSourceSide = ref<'left' | 'right' | null>(null);
		const currentMouseX = ref(0);
		const currentMouseY = ref(0);

		const cancelLinking = () => {
			linkingSourceItem.value = null;
			linkingSourceSide.value = null;
		};

		const onBackgroundClick = () => {
			if (linkingSourceItem.value) {
				cancelLinking();
			}
		};

		// Item 5: Escape key listener to cancel relationship creation mode
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && linkingSourceItem.value) {
				cancelLinking();
			}
		};

		const containerWidth = ref(0);
		const updateContainerWidth = () => {
			if (timelineContainer.value) {
				containerWidth.value = timelineContainer.value.clientWidth;
			}
		};

		let resizeObserver: any = null;
		onMounted(() => {
			if (typeof window !== 'undefined') {
				window.addEventListener('keydown', handleKeyDown);
				window.addEventListener('resize', updateContainerWidth);
				updateContainerWidth();
				if ((window as any).ResizeObserver && timelineContainer.value) {
					resizeObserver = new (window as any).ResizeObserver(() => {
						updateContainerWidth();
					});
					resizeObserver.observe(timelineContainer.value);
				}
			}
		});

		onUnmounted(() => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('keydown', handleKeyDown);
				window.removeEventListener('resize', updateContainerWidth);
				if (resizeObserver) {
					resizeObserver.disconnect();
				}
			}
		});

		const parseTaskDate = (dateStr?: string | Date): Date | null => {
			if (!dateStr) return null;
			if (dateStr instanceof Date) return dateStr;
			if (/^\d{8}T\d{6}Z$/.test(dateStr)) {
				const year = parseInt(dateStr.substring(0, 4), 10);
				const month = parseInt(dateStr.substring(4, 6), 10) - 1;
				const day = parseInt(dateStr.substring(6, 8), 10);
				return new Date(Date.UTC(year, month, day));
			}
			const parsed = new Date(dateStr);
			return isNaN(parsed.getTime()) ? null : parsed;
		};

		// Map of all tasks by UUID and by numeric ID for dependency lookups
		const allTasksMap = computed(() => {
			const map = new Map<string, Task>();
			(props.tasks || []).forEach(t => {
				if (t.uuid) map.set(t.uuid, t);
				if (t.id !== undefined && t.id !== null) map.set(String(t.id), t);
			});
			return map;
		});

		// Dependents count map (number of tasks that depend on this task)
		const dependentsCountMap = computed(() => {
			const countMap = new Map<string, number>();
			(props.tasks || []).forEach(t => {
				if (t.depends) {
					const deps = Array.isArray(t.depends) ? t.depends : String(t.depends).split(',');
					deps.forEach(d => {
						const trimmed = d.trim();
						if (trimmed) {
							countMap.set(trimmed, (countMap.get(trimmed) || 0) + 1);
						}
					});
				}
			});
			return countMap;
		});

		// Filter tasks by selected statuses
		const filteredTasks = computed((): Task[] => {
			if (!props.tasks || !selectedStatuses.value || !selectedStatuses.value.length) return [];
			const taskSet = new Set<string>();
			const result: Task[] = [];
			for (const st of selectedStatuses.value) {
				const entry: any = classifiedTasks[st];
				const list: Task[] = Array.isArray(entry) ? entry : (entry?.value || []);
				for (const task of list) {
					if (task.uuid && !taskSet.has(task.uuid)) {
						taskSet.add(task.uuid);
						result.push(task);
					}
				}
			}
			return result;
		});

		// Helper to strip time and set to 00:00:00.000 local
		const startOfDay = (d: Date): Date => {
			return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
		};

		// Calendar date and task length resolution according to user rules:
		// 1. Use task.start
		// 2. If no start, use task.due
		// 3. If no date, after the end of the latest precedent task
		// 4. If no date and no precedent task, today
		// Length: If start and due date, cross all dates/columns from first to due date inclusive (start of day after due). Otherwise 1 day.
		const resolvedTaskDates = computed(() => {
			const dateMap = new Map<string, { start: Date; end: Date }>();
			const visiting = new Set<string>();

			const resolveTask = (t: Task): { start: Date; end: Date } => {
				const key = t.uuid || String(t.id || '');
				if (key && dateMap.has(key)) {
					return dateMap.get(key)!;
				}

				if (key && visiting.has(key)) {
					// Cycle detected, fallback to today
					const nowStart = startOfDay(new Date());
					const nowEnd = new Date(nowStart.getTime() + 86400000);
					return { start: nowStart, end: nowEnd };
				}

				if (key) visiting.add(key);

				const rawStart = parseTaskDate(t.start);
				const rawDue = parseTaskDate(t.due);

				let startDate: Date;
				let endDate: Date;

				if (rawStart && rawDue) {
					const sDay = startOfDay(rawStart);
					const dDay = startOfDay(rawDue);
					if (dDay >= sDay) {
						startDate = sDay;
						// Cross all columns from start to due date inclusive (don't stop the day before)
						endDate = new Date(dDay.getFullYear(), dDay.getMonth(), dDay.getDate() + 1, 0, 0, 0, 0);
					}
					else {
						startDate = sDay;
						endDate = new Date(sDay.getTime() + 86400000);
					}
				}
				else if (rawStart) {
					startDate = startOfDay(rawStart);
					endDate = new Date(startDate.getTime() + 86400000);
				}
				else if (rawDue) {
					startDate = startOfDay(rawDue);
					endDate = new Date(startDate.getTime() + 86400000);
				}
				else {
					// Check precedent tasks
					let latestPrecedentEnd: Date | null = null;
					if (t.depends) {
						const deps = Array.isArray(t.depends) ? t.depends : String(t.depends).split(',');
						for (const dep of deps) {
							const depKey = dep.trim();
							const parentTask = allTasksMap.value.get(depKey);
							if (parentTask) {
								const parentDates = resolveTask(parentTask);
								if (!latestPrecedentEnd || parentDates.end.getTime() > latestPrecedentEnd.getTime()) {
									latestPrecedentEnd = parentDates.end;
								}
							}
						}
					}

					if (latestPrecedentEnd) {
						startDate = startOfDay(latestPrecedentEnd);
						endDate = new Date(startDate.getTime() + 86400000);
					}
					else {
						// Today
						startDate = startOfDay(new Date());
						endDate = new Date(startDate.getTime() + 86400000);
					}
				}

				const res = { start: startDate, end: endDate };
				if (key) {
					dateMap.set(key, res);
					visiting.delete(key);
				}
				if (t.uuid) dateMap.set(t.uuid, res);
				if (t.id !== undefined && t.id !== null) dateMap.set(String(t.id), res);

				return res;
			};

			(props.tasks || []).forEach(t => {
				resolveTask(t);
			});

			return dateMap;
		});

		// 5-tier vertical sorting:
		// 1. Status: non-deleted first, deleted last
		// 2. Priority: H > M > L > none
		// 3. Urgency: descending
		// 4. Dependents count: descending
		// 5. Alphabetically: localeCompare on description
		const sortedTasks = computed(() => {
			const tasksList = [...filteredTasks.value];

			const priorityOrder: Record<string, number> = {
				H: 1,
				M: 2,
				L: 3
			};

			tasksList.sort((a, b) => {
				// Tier 0: Status (non-deleted first, deleted last)
				const isDelA = a.status === 'deleted' ? 1 : 0;
				const isDelB = b.status === 'deleted' ? 1 : 0;
				if (isDelA !== isDelB) return isDelA - isDelB;

				// Tier 1: Priority
				const pA = a.priority ? (priorityOrder[a.priority.toUpperCase()] || 4) : 4;
				const pB = b.priority ? (priorityOrder[b.priority.toUpperCase()] || 4) : 4;
				if (pA !== pB) return pA - pB;

				// Tier 2: Urgency (descending)
				const urgA = typeof (a as any).urgency === 'number' ? (a as any).urgency : Number((a as any).urgency || 0);
				const urgB = typeof (b as any).urgency === 'number' ? (b as any).urgency : Number((b as any).urgency || 0);
				if (urgB !== urgA) return urgB - urgA;

				// Tier 3: Number of dependents (descending)
				const depsA = (a.uuid ? (dependentsCountMap.value.get(a.uuid) || 0) : 0)
					+ ((a.id !== undefined && a.id !== null) ? (dependentsCountMap.value.get(String(a.id)) || 0) : 0);
				const depsB = (b.uuid ? (dependentsCountMap.value.get(b.uuid) || 0) : 0)
					+ ((b.id !== undefined && b.id !== null) ? (dependentsCountMap.value.get(String(b.id)) || 0) : 0);
				if (depsB !== depsA) return depsB - depsA;

				// Tier 4: Alphabetical by description
				const descA = a.description || '';
				const descB = b.description || '';
				return descA.localeCompare(descB);
			});

			return tasksList;
		});

		const timelineDateRange = computed(() => {
			const now = new Date();
			const today = startOfDay(now);

			let earliestTaskStart: Date | null = null;
			let latestTaskEnd: Date | null = null;

			sortedTasks.value.forEach(t => {
				const key = t.uuid || String(t.id || '');
				const dates = resolvedTaskDates.value.get(key);
				if (dates) {
					if (!earliestTaskStart || dates.start < earliestTaskStart) {
						earliestTaskStart = new Date(dates.start);
					}
					if (!latestTaskEnd || dates.end > latestTaskEnd) {
						latestTaskEnd = new Date(dates.end);
					}
				}
			});

			if (!earliestTaskStart) earliestTaskStart = today;
			if (!latestTaskEnd) latestTaskEnd = new Date(today.getTime() + 86400000);

			let minDate: Date;
			let maxDate: Date;

			if (props.zoom === 'Sequence') {
				// Calendarless / Sequence view: starts on the day of the first task, zero past buffer
				minDate = startOfDay(earliestTaskStart);
				maxDate = new Date(latestTaskEnd);
				if (maxDate <= minDate) {
					maxDate = new Date(minDate.getTime() + 86400000);
				}
			}
			else if (props.zoom === 'Day') {
				// Day view: starts 3 days ago, ends 14 days ahead, expanding if tasks extend beyond
				minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 0, 0, 0, 0);
				maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14, 0, 0, 0, 0);
				if (earliestTaskStart < minDate) minDate = new Date(earliestTaskStart);
				if (latestTaskEnd > maxDate) maxDate = new Date(latestTaskEnd);
			}
			else if (props.zoom === 'Week') {
				// Week view: start on Monday of earliest task, end on Sunday of latest task - zero empty weeks!
				const startWeek = new Date(earliestTaskStart);
				const startDay = startWeek.getDay() || 7;
				startWeek.setDate(startWeek.getDate() - (startDay - 1));
				startWeek.setHours(0, 0, 0, 0);
				minDate = startWeek;

				const endWeek = new Date(latestTaskEnd);
				const endDay = endWeek.getDay() || 7;
				endWeek.setDate(endWeek.getDate() + (7 - endDay));
				endWeek.setHours(23, 59, 59, 999);
				maxDate = endWeek;
			}
			else {
				// Month view: start on 1st of earliest task month, end on last day of latest task month - zero empty months!
				minDate = new Date(earliestTaskStart.getFullYear(), earliestTaskStart.getMonth(), 1, 0, 0, 0, 0);
				maxDate = new Date(latestTaskEnd.getFullYear(), latestTaskEnd.getMonth() + 1, 0, 23, 59, 59, 999);
			}

			return { minDate, maxDate };
		});

		const timelineColumns = computed(() => {
			const { minDate, maxDate } = timelineDateRange.value;
			const columns = [];
			let curr = new Date(minDate);

			if (props.zoom === 'Sequence') {
				let step = 1;
				while (curr <= maxDate) {
					columns.push({
						date: new Date(curr),
						title: `Step ${step}`,
						subtitle: ''
					});
					step++;
					curr = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 1);
				}
			}
			else if (props.zoom === 'Day') {
				while (curr <= maxDate) {
					const dateName = curr.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
					columns.push({
						date: new Date(curr),
						title: dateName,
						subtitle: `${curr.getDate()}`
					});
					curr = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 1);
				}
			}
			else if (props.zoom === 'Week') {
				while (curr <= maxDate) {
					const weekStr = `W${getWeekNumber(curr)}`;
					columns.push({
						date: new Date(curr),
						title: weekStr,
						subtitle: curr.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
					});
					curr = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + 7);
				}
			}
			else {
				while (curr <= maxDate) {
					columns.push({
						date: new Date(curr),
						title: curr.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
						subtitle: ''
					});
					curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
				}
			}

			return columns;
		});

		// Dynamic fluid column width: expands columns to fill container width, eliminating empty space,
		// but enforces generous minimum column widths so populated weeks/months have wide channels and horizontal scrolling.
		const colWidth = computed(() => {
			let minColWidth = 140;
			if (props.zoom === 'Sequence' || props.zoom === 'Day') {
				minColWidth = 140;
			}
			else if (props.zoom === 'Week') {
				minColWidth = 700; // 100px per day gives ample channel space for multi-track non-overlapping vertical lines
			}
			else if (props.zoom === 'Month') {
				minColWidth = 1500; // 50px per day gives ample channel space across month days
			}

			const numCols = timelineColumns.value ? timelineColumns.value.length : 0;
			if (numCols <= 0 || containerWidth.value <= 0) return minColWidth;

			const availableSpace = containerWidth.value - timelinePaddingLeft - 40;
			if (availableSpace <= 0) return minColWidth;

			const distributed = Math.floor(availableSpace / numCols);
			return Math.max(minColWidth, distributed);
		});

		const totalTimelineWidth = computed(() => {
			const colsWidth = timelinePaddingLeft + (timelineColumns.value.length * colWidth.value) + 40;
			return Math.max(containerWidth.value, colsWidth);
		});

		const getWeekNumber = (d: Date) => {
			const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
			const dayNum = date.getUTCDay() || 7;
			date.setUTCDate(date.getUTCDate() + 4 - dayNum);
			const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
			return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
		};

		const processedTasks = computed<ProcessedTask[]>(() => {
			const { minDate } = timelineDateRange.value;
			const minTime = minDate.getTime();
			const zoom = props.zoom;
			const msPerCol = (zoom === 'Sequence' || zoom === 'Day')
				? 86400000
				: (zoom === 'Week' ? 604800000 : 2592000000);
			const colW = colWidth.value;

			return sortedTasks.value.map((t, idx) => {
				const key = t.uuid || String(t.id || '');
				const dates = resolvedTaskDates.value.get(key) || {
					start: startOfDay(new Date()),
					end: new Date(startOfDay(new Date()).getTime() + 86400000)
				};
				const start = dates.start;
				const end = dates.end;

				const startOffsetCols = (start.getTime() - minTime) / msPerCol;
				const endOffsetCols = (end.getTime() - minTime) / msPerCol;

				const leftPx = timelinePaddingLeft + Math.max(0, startOffsetCols * colW);
				const rawWidth = (endOffsetCols - startOffsetCols) * colW;
				const widthPx = Math.max(36, rawWidth);

				// Adaptive side padding: in Sequence/Day view 28px; in Week view 20px; in Month view 10px
				const padding = (zoom === 'Sequence' || zoom === 'Day')
					? 28
					: (zoom === 'Week' ? 20 : 10);

				const barLeft = leftPx + padding;
				const minBarW = (zoom === 'Sequence' || zoom === 'Day') ? 80 : (zoom === 'Week' ? 50 : 36);
				const barWidth = Math.max(minBarW, widthPx - padding * 2);

				return {
					task: t,
					startDate: start,
					endDate: end,
					leftPx,
					widthPx,
					barLeft,
					barWidth,
					rowIndex: idx
				};
			});
		});

		// Staggered vertical gap offset routing & Line Crossing Bridge Jumps
		const dependencyLinks = computed<DependencyLink[]>(() => {
			const rawLinks: {
				id: string;
				sourceTask: Task;
				targetTask: Task;
				midX: number;
				midY: number;
				segments: { x1: number; y1: number; x2: number; y2: number; isHorizontal: boolean }[];
			}[] = [];

			const taskMap = new Map<string, ProcessedTask>();
			const idMap = new Map<number | string, ProcessedTask>();

			processedTasks.value.forEach(pt => {
				if (pt.task.uuid) taskMap.set(pt.task.uuid, pt);
				if (pt.task.id !== undefined && pt.task.id !== null) idMap.set(pt.task.id, pt);
			});

			// Tracking structures to prevent > 2 lines crossing at any position and prevent overlapping corridors
			const allocatedVerts: { x: number; yMin: number; yMax: number; linkId: string }[] = [];
			const allocatedHorizs: { y: number; xMin: number; xMax: number; linkId: string }[] = [];
			const registeredCrossings: { x: number; y: number }[] = [];

			const isVerticalClear = (
				candX: number,
				y1: number,
				y2: number,
				excludeTaskUuids: (string | undefined)[] = []
			): boolean => {
				const yMin = Math.min(y1, y2);
				const yMax = Math.max(y1, y2);

				// 1. Must NOT cross through any task card in processedTasks
				const cardMargin = props.zoom === 'Month' ? 4 : 8;
				for (const pt of processedTasks.value) {
					if (excludeTaskUuids.includes(pt.task.uuid)) continue;

					const taskTop = pt.rowIndex * rowHeight;
					const taskBottom = (pt.rowIndex + 1) * rowHeight;

					// Check if the vertical line spans through the row of this task
					if (yMax > taskTop + 2 && yMin < taskBottom - 2) {
						// Horizontal bounds of the task card including safety margin
						const cardLeft = pt.barLeft - cardMargin;
						const cardRight = pt.barLeft + pt.barWidth + cardMargin;
						if (candX >= cardLeft && candX <= cardRight) {
							return false; // Crosses a task card!
						}
					}
				}

				const paddedYMin = yMin - 14;
				const paddedYMax = yMax + 14;

				// 2. Must not overlap with or run too close to any parallel vertical line (at least 7px separation)
				for (const v of allocatedVerts) {
					if (Math.abs(v.x - candX) < 7) {
						const overlap = Math.min(paddedYMax, v.yMax) - Math.max(paddedYMin, v.yMin);
						if (overlap > 0) {
							return false; // Y ranges overlap or are too close end-to-end!
						}
					}
				}

				// 3. Must not cross any horizontal line at an already-occupied crossing point
				for (const h of allocatedHorizs) {
					if (candX > h.xMin + 4 && candX < h.xMax - 4 && h.y > paddedYMin + 4 && h.y < paddedYMax - 4) {
						for (const cp of registeredCrossings) {
							if (Math.abs(cp.x - candX) < 12 && Math.abs(cp.y - h.y) < 6) {
								return false; // Point already has a crossing! Pick another spot.
							}
						}
					}
				}

				return true;
			};

			const isHorizontalClear = (candY: number, x1: number, x2: number): boolean => {
				const xMin = Math.min(x1, x2);
				const xMax = Math.max(x1, x2);

				// 1. Must not overlap with any parallel horizontal line (at least 5px vertical separation)
				for (const h of allocatedHorizs) {
					const overlap = Math.min(xMax, h.xMax) - Math.max(xMin, h.xMin);
					if (overlap > 2 && Math.abs(h.y - candY) < 5) {
						return false;
					}
				}

				// 2. Must not cross any vertical line at an already-occupied crossing point
				for (const v of allocatedVerts) {
					if (v.x > xMin + 4 && v.x < xMax - 4 && candY > v.yMin + 4 && candY < v.yMax - 4) {
						for (const cp of registeredCrossings) {
							if (Math.abs(cp.x - v.x) < 12 && Math.abs(cp.y - candY) < 6) {
								return false; // Point already has a crossing! Pick another spot.
							}
						}
					}
				}

				return true;
			};

			// 1. Collect all dependency links to route
			interface LinkToRoute {
				id: string;
				sourcePt: ProcessedTask;
				targetPt: ProcessedTask;
				startX: number;
				startY: number;
				endX: number;
				endY: number;
				isForward: boolean;
			}
			const linksToRoute: LinkToRoute[] = [];

			processedTasks.value.forEach(targetPt => {
				const depends = targetPt.task.depends;
				if (!depends) return;

				const prereqRefs = Array.isArray(depends)
					? depends
					: String(depends).split(',').map(s => s.trim());

				prereqRefs.forEach(ref => {
					let sourcePt = taskMap.get(ref);
					if (!sourcePt && !isNaN(Number(ref))) {
						sourcePt = idMap.get(Number(ref));
					}

					if (sourcePt && sourcePt.task.uuid !== targetPt.task.uuid) {
						const startX = sourcePt.barLeft + sourcePt.barWidth;
						const startY = (sourcePt.rowIndex * rowHeight) + (rowHeight / 2);
						const endX = targetPt.barLeft;
						const endY = (targetPt.rowIndex * rowHeight) + (rowHeight / 2);

						linksToRoute.push({
							id: `${sourcePt.task.uuid}-${targetPt.task.uuid}`,
							sourcePt,
							targetPt,
							startX,
							startY,
							endX,
							endY,
							isForward: endX >= startX + 16
						});
					}
				});
			});

			// Sort links by target row index ascending so slots are allocated systematically
			linksToRoute.sort((a, b) => a.targetPt.rowIndex - b.targetPt.rowIndex);

			// 2. Route each link with dedicated vertical corridors
			linksToRoute.forEach(link => {
				const { id, sourcePt, targetPt, startX, startY, endX, endY, isForward } = link;
				const segments: { x1: number; y1: number; x2: number; y2: number; isHorizontal: boolean }[] = [];
				let midX = 0;
				let midY = 0;

				if (isForward) {
					// Forward dependency: corridor is between startX + 8 and endX - 8
					const minAllowedX = startX + 8;

					// Generate candidate vertical tracks spaced 9px apart from endX - 10 backwards
					const candidates: number[] = [];
					for (let c = endX - 10; c >= minAllowedX; c -= 9) {
						candidates.push(c);
					}
					if (candidates.length === 0) {
						candidates.push(Math.round((startX + endX) / 2));
					}

					// Stagger preferred track per target row within the first few candidates near endX,
					// but all candidates backwards will be evaluated to find an unobstructed corridor
					const maxStagger = Math.min(5, candidates.length);
					const prefIdx = targetPt.rowIndex % maxStagger;
					const preferredCandidates = [
						candidates[prefIdx],
						...candidates.filter((_, i) => i !== prefIdx)
					];

					let chosenVX = -1;
					for (const candX of preferredCandidates) {
						if (isVerticalClear(candX, startY, endY, [sourcePt.task.uuid, targetPt.task.uuid])) {
							chosenVX = candX;
							break;
						}
					}

					// If primary tracks are all occupied, try fine-step offset candidates
					if (chosenVX < 0) {
						for (let c = endX - 14; c >= minAllowedX; c -= 5) {
							if (!candidates.includes(c) && isVerticalClear(c, startY, endY, [sourcePt.task.uuid, targetPt.task.uuid])) {
								chosenVX = c;
								break;
							}
						}
					}

					// Fallback: pick candidate with best clearance from existing verticals and task cards
					if (chosenVX < 0) {
						let bestScore = -999999;
						let bestCand = candidates[0];
						const yMin = Math.min(startY, endY);
						const yMax = Math.max(startY, endY);
						const cardMargin = props.zoom === 'Month' ? 4 : 8;

						for (const candX of candidates) {
							let minDist = 9999;
							let totalOverlap = 0;
							for (const v of allocatedVerts) {
								const overlap = Math.min(yMax, v.yMax) - Math.max(yMin, v.yMin);
								if (overlap > 0 && Math.abs(v.x - candX) < 8) {
									totalOverlap += overlap;
								}
								minDist = Math.min(minDist, Math.abs(v.x - candX));
							}

							let taskCollision = false;
							for (const pt of processedTasks.value) {
								if (pt.task.uuid === sourcePt.task.uuid || pt.task.uuid === targetPt.task.uuid) continue;
								const taskTop = pt.rowIndex * rowHeight;
								const taskBottom = (pt.rowIndex + 1) * rowHeight;
								if (yMax > taskTop + 2 && yMin < taskBottom - 2) {
									if (candX >= pt.barLeft - cardMargin && candX <= pt.barLeft + pt.barWidth + cardMargin) {
										taskCollision = true;
										break;
									}
								}
							}

							let score = minDist * 10 - totalOverlap;
							if (taskCollision) {
								score -= 1000000;
							}

							if (score > bestScore) {
								bestScore = score;
								bestCand = candX;
							}
						}
						chosenVX = bestCand;
					}

					segments.push({ x1: startX, y1: startY, x2: chosenVX, y2: startY, isHorizontal: true });
					segments.push({ x1: chosenVX, y1: startY, x2: chosenVX, y2: endY, isHorizontal: false });
					segments.push({ x1: chosenVX, y1: endY, x2: endX, y2: endY, isHorizontal: true });

					midX = chosenVX;
					midY = (startY + endY) / 2;

					allocatedVerts.push({ x: chosenVX, yMin: Math.min(startY, endY), yMax: Math.max(startY, endY), linkId: id });
					allocatedHorizs.push({ y: startY, xMin: Math.min(startX, chosenVX), xMax: Math.max(startX, chosenVX), linkId: id });
					allocatedHorizs.push({ y: endY, xMin: Math.min(chosenVX, endX), xMax: Math.max(chosenVX, endX), linkId: id });
				}
				else {
					// Backward / Overlapping dependency: route through vertical gap and inter-row spacing
					const outOffset = 10 + (sourcePt.rowIndex % 4) * 8;
					let chosenVXOut = startX + outOffset;
					for (const off of [outOffset, 10, 18, 26, 34, 42]) {
						const candX = startX + off;
						if (isVerticalClear(candX, startY, startY + (targetPt.rowIndex > sourcePt.rowIndex ? 40 : -40), [sourcePt.task.uuid, targetPt.task.uuid])) {
							chosenVXOut = candX;
							break;
						}
					}

					const isBelow = targetPt.rowIndex > sourcePt.rowIndex;
					const baseBypassY = isBelow
						? (targetPt.rowIndex * rowHeight)
						: ((targetPt.rowIndex + 1) * rowHeight);

					let chosenBypassY = baseBypassY;
					const yOffsets = [0, -4, 4, -8, 8];
					for (const yOff of yOffsets) {
						const candY = baseBypassY + yOff;
						if (isHorizontalClear(candY, 14, chosenVXOut)) {
							chosenBypassY = candY;
							break;
						}
					}

					const inOffset = 10 + (targetPt.rowIndex % 4) * 8;
					let chosenVXIn = Math.max(14, endX - inOffset);
					for (const off of [inOffset, 10, 18, 26, 34, 42]) {
						const candX = endX - off;
						if (candX < 14) break;
						if (isVerticalClear(candX, chosenBypassY, endY, [sourcePt.task.uuid, targetPt.task.uuid])) {
							chosenVXIn = candX;
							break;
						}
					}

					segments.push({ x1: startX, y1: startY, x2: chosenVXOut, y2: startY, isHorizontal: true });
					segments.push({ x1: chosenVXOut, y1: startY, x2: chosenVXOut, y2: chosenBypassY, isHorizontal: false });
					segments.push({ x1: chosenVXOut, y1: chosenBypassY, x2: chosenVXIn, y2: chosenBypassY, isHorizontal: true });
					segments.push({ x1: chosenVXIn, y1: chosenBypassY, x2: chosenVXIn, y2: endY, isHorizontal: false });
					segments.push({ x1: chosenVXIn, y1: endY, x2: endX, y2: endY, isHorizontal: true });

					midX = chosenVXOut;
					midY = (startY + chosenBypassY) / 2;

					allocatedVerts.push({ x: chosenVXOut, yMin: Math.min(startY, chosenBypassY), yMax: Math.max(startY, chosenBypassY), linkId: id });
					allocatedVerts.push({ x: chosenVXIn, yMin: Math.min(chosenBypassY, endY), yMax: Math.max(chosenBypassY, endY), linkId: id });
					allocatedHorizs.push({ y: startY, xMin: Math.min(startX, chosenVXOut), xMax: Math.max(startX, chosenVXOut), linkId: id });
					allocatedHorizs.push({ y: chosenBypassY, xMin: Math.min(chosenVXIn, chosenVXOut), xMax: Math.max(chosenVXIn, chosenVXOut), linkId: id });
					allocatedHorizs.push({ y: endY, xMin: Math.min(chosenVXIn, endX), xMax: Math.max(chosenVXIn, endX), linkId: id });
				}

				// Register crossings between the new segments and previously allocated segments
				segments.forEach(seg => {
					if (seg.isHorizontal) {
						const xMin = Math.min(seg.x1, seg.x2);
						const xMax = Math.max(seg.x1, seg.x2);
						allocatedVerts.forEach(v => {
							if (v.linkId !== id && v.x > xMin + 4 && v.x < xMax - 4 && seg.y1 > v.yMin + 4 && seg.y1 < v.yMax - 4) {
								registeredCrossings.push({ x: v.x, y: seg.y1 });
							}
						});
					}
				});

				rawLinks.push({
					id,
					sourceTask: sourcePt.task,
					targetTask: targetPt.task,
					midX,
					midY,
					segments
				});
			});

			// Collect all vertical segments across all links for line crossing detection
			const allVerticalSegments: { x: number; yMin: number; yMax: number; linkId: string }[] = [];
			rawLinks.forEach(l => {
				l.segments.filter(s => !s.isHorizontal).forEach(s => {
					allVerticalSegments.push({
						x: s.x1,
						yMin: Math.min(s.y1, s.y2),
						yMax: Math.max(s.y1, s.y2),
						linkId: l.id
					});
				});
			});

			// Build SVG paths with bridge jumps for crossings
			return rawLinks.map(l => {
				let d = '';

				l.segments.forEach((seg, sIdx) => {
					if (sIdx === 0) {
						d += `M ${seg.x1} ${seg.y1} `;
					}

					if (!seg.isHorizontal) {
						// Straight vertical segment
						d += `L ${seg.x2} ${seg.y2} `;
					}
					else {
						// Horizontal segment: find any crossing vertical lines
						const y = seg.y1;
						const xStart = seg.x1;
						const xEnd = seg.x2;
						const xMin = Math.min(xStart, xEnd);
						const xMax = Math.max(xStart, xEnd);
						const goingRight = xEnd >= xStart;

						// Find crossing vertical lines from other links
						const crossings = allVerticalSegments.filter(v => {
							return v.linkId !== l.id && v.x > xMin + 4 && v.x < xMax - 4 && y > v.yMin + 2 && y < v.yMax - 2;
						});

						if (crossings.length === 0) {
							d += `L ${xEnd} ${y} `;
						}
						else {
							// Sort crossings along travel direction
							if (goingRight) {
								crossings.sort((a, b) => a.x - b.x);
							}
							else {
								crossings.sort((a, b) => b.x - a.x);
							}

							// Deduplicate crossings that are too close (< 6px) to avoid bridge collisions
							const uniqueCrossings: typeof crossings = [];
							crossings.forEach(cr => {
								if (!uniqueCrossings.some(u => Math.abs(u.x - cr.x) < 6)) {
									uniqueCrossings.push(cr);
								}
							});

							uniqueCrossings.forEach(cr => {
								const cx = cr.x;
								const r = 4; // Bridge radius
								if (goingRight) {
									d += `L ${cx - r} ${y} A ${r} ${r} 0 0 0 ${cx + r} ${y} `;
								}
								else {
									d += `L ${cx + r} ${y} A ${r} ${r} 0 0 1 ${cx - r} ${y} `;
								}
							});

							d += `L ${xEnd} ${y} `;
						}
					}
				});

				return {
					id: l.id,
					sourceTask: l.sourceTask,
					targetTask: l.targetTask,
					path: d.trim(),
					midX: l.midX,
					midY: l.midY
				};
			});
		});

		// Dynamic active drag line path
		const dragLinePath = computed(() => {
			if (!linkingSourceItem.value || !linkingSourceSide.value) return '';
			const src = linkingSourceItem.value;
			const side = linkingSourceSide.value;

			const anchorX = side === 'right' ? (src.barLeft + src.barWidth) : src.barLeft;
			const anchorY = (src.rowIndex * rowHeight) + (rowHeight / 2);
			const mouseX = currentMouseX.value;
			const mouseY = currentMouseY.value;

			if (side === 'right') {
				// Arrow originates from right anchor and points at cursor
				const midX = (anchorX + mouseX) / 2;
				return `M ${anchorX} ${anchorY} L ${midX} ${anchorY} L ${midX} ${mouseY} L ${mouseX} ${mouseY}`;
			}
			else {
				// Arrow originates from cursor and points INTO the left anchor
				const midX = (mouseX + anchorX) / 2;
				return `M ${mouseX} ${mouseY} L ${midX} ${mouseY} L ${midX} ${anchorY} L ${anchorX} ${anchorY}`;
			}
		});

		const isTargetAnchor = (item: ProcessedTask, side: 'left' | 'right') => {
			if (!linkingSourceItem.value || !linkingSourceSide.value) return false;
			if (linkingSourceItem.value.task.uuid === item.task.uuid) return false;
			if (linkingSourceSide.value === 'right') return side === 'left';
			if (linkingSourceSide.value === 'left') return side === 'right';
			return false;
		};

		const onAnchorMouseDown = (item: ProcessedTask, side: 'left' | 'right', evt: MouseEvent) => {
			if (linkingSourceItem.value) {
				// Already in linking mode: do not overwrite source on mousedown
				return;
			}
			linkingSourceItem.value = item;
			linkingSourceSide.value = side;
			updateMousePosition(evt);
		};

		// Click anchor handler resetting state cleanly after connection
		const onAnchorClick = (item: ProcessedTask, side: 'left' | 'right') => {
			if (!linkingSourceItem.value) {
				// 1st click: Enter linking mode
				linkingSourceItem.value = item;
				linkingSourceSide.value = side;
			}
			else if (linkingSourceItem.value.task.uuid === item.task.uuid && linkingSourceSide.value === side) {
				// Clicked same anchor: cancel
				cancelLinking();
			}
			else if (linkingSourceSide.value && isTargetAnchor(item, side)) {
				// Clicked valid 2nd anchor: connect them!
				connectAnchors(linkingSourceItem.value, linkingSourceSide.value, item, side);
			}
			else {
				cancelLinking();
			}
		};

		// Mouse up on anchor: connects if user dragged to target anchor
		const onAnchorMouseUp = (targetItem: ProcessedTask, targetSide: 'left' | 'right') => {
			if (!linkingSourceItem.value || !linkingSourceSide.value) return;

			if (linkingSourceItem.value.task.uuid !== targetItem.task.uuid && isTargetAnchor(targetItem, targetSide)) {
				connectAnchors(linkingSourceItem.value, linkingSourceSide.value, targetItem, targetSide);
			}
		};

		const connectAnchors = (sourceItem: any, sourceSide: 'left' | 'right', targetItem: any, targetSide: 'left' | 'right') => {
			if (!sourceItem || !targetItem) return;
			if (sourceSide === 'right' && targetSide === 'left') {
				addDependencyRelation(targetItem.task, sourceItem.task.uuid);
			}
			else if (sourceSide === 'left' && targetSide === 'right') {
				addDependencyRelation(sourceItem.task, targetItem.task.uuid);
			}
			cancelLinking();
		};

		const addDependencyRelation = (dependentTask: Task, prereqUuid: string) => {
			const raw = dependentTask.depends;
			const currentDepends: string[] = Array.isArray(raw)
				? [...raw]
				: (raw ? String(raw).split(',').map(s => s.trim()) : []);

			if (!currentDepends.includes(prereqUuid)) {
				currentDepends.push(prereqUuid);
				const updatedTask: Task = { ...dependentTask, depends: currentDepends };
				ctx.emit('add-dependency', { task: updatedTask, prereqUuid });
			}
		};

		const handleRemoveDependency = (link: DependencyLink) => {
			const targetTask = link.targetTask;
			const prereqUuid = link.sourceTask.uuid;
			const prereqId = (link.sourceTask.id !== undefined && link.sourceTask.id !== null) ? String(link.sourceTask.id) : null;

			const raw = targetTask.depends;
			const currentDepends: string[] = Array.isArray(raw)
				? [...raw]
				: (raw ? String(raw).split(',').map(s => s.trim()) : []);

			const newDepends = currentDepends.filter(d => d !== prereqUuid && d !== prereqId);
			const updatedTask: Task = { ...targetTask, depends: newDepends };

			ctx.emit('remove-dependency', { task: updatedTask, prereqUuid });
		};

		// Item 6: Prevent opening task edit popup when in link creation mode
		const handleTaskClick = (task: Task) => {
			if (linkingSourceItem.value) return;
			ctx.emit('edit', task);
		};

		const onMouseMove = (evt: MouseEvent) => {
			if (linkingSourceItem.value) {
				updateMousePosition(evt);
			}
		};

		const onMouseUp = () => {
			// Linking reset handled on target anchor or click
		};

		const updateMousePosition = (evt: MouseEvent) => {
			const timelineEl = timelineContainer.value;
			if (timelineEl) {
				const rect = timelineEl.getBoundingClientRect();
				currentMouseX.value = evt.clientX - rect.left + timelineEl.scrollLeft;
				currentMouseY.value = evt.clientY - rect.top + timelineEl.scrollTop - headerHeight;
			}
		};

		const getTaskBarStyle = (item: ProcessedTask) => {
			let color = '#2196F3';
			if (item.task.status === 'completed') color = '#4CAF50';
			else if (item.task.start || item.task.uuid === props.activeTaskUuid) color = '#FF9800';

			return {
				left: `${item.barLeft}px`,
				width: `${item.barWidth}px`,
				backgroundColor: color,
				borderRadius: '4px',
				height: `${rowHeight - 12}px`,
				top: '6px'
			};
		};

		const getPriorityColor = (priority?: string) => {
			if (priority === 'H') return 'red';
			if (priority === 'M') return 'orange';
			if (priority === 'L') return 'blue';
			return 'grey';
		};

		const formatDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

		return {
			timelineContainer,
			sidebarWidth,
			rowHeight,
			headerHeight,
			colWidth,
			timelinePaddingLeft,
			zoomOptions,
			selectedZoomIndex,
			onZoomChange,
			allStatus,
			statusIcons,
			selectedStatuses,
			classifiedTasks,
			hoveredLinkId,
			onLinkMouseEnter,
			onLinkMouseLeave,
			linkingSourceItem,
			linkingSourceSide,
			dragLinePath,
			timelineColumns,
			totalTimelineWidth,
			processedTasks,
			dependencyLinks,
			isTargetAnchor,
			onAnchorMouseDown,
			onAnchorClick,
			onAnchorMouseUp,
			handleRemoveDependency,
			handleTaskClick,
			onMouseMove,
			onMouseUp,
			onBackgroundClick,
			getTaskBarStyle,
			getPriorityColor,
			formatDate
		};
	}
});
</script>

<style scoped>
.gantt-chart-container {
	width: 100%;
	user-select: none;
}
.gantt-wrapper {
	display: flex;
	overflow-x: auto;
	position: relative;
}
.gantt-sidebar {
	flex-shrink: 0;
	z-index: 2;
	background-color: inherit;
	border-right: 1px solid rgba(128, 128, 128, 0.2);
}
.gantt-timeline-container {
	flex-grow: 1;
	overflow-x: auto;
	position: relative;
}
.gantt-svg-wrapper {
	position: relative;
}
.border-bottom {
	border-bottom: 1px solid rgba(128, 128, 128, 0.2);
}
.border-right {
	border-right: 1px solid rgba(128, 128, 128, 0.15);
}
.sidebar-row {
	cursor: pointer;
	transition: background-color 0.2s;
}
.sidebar-row:hover {
	background-color: rgba(128, 128, 128, 0.1);
}
.timeline-body {
	position: relative;
}
.grid-background {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	pointer-events: none;
}
.gantt-svg-layer {
	position: absolute;
	top: 0;
	left: 0;
	pointer-events: none;
	z-index: 3;
}
.task-row-layer {
	position: absolute;
	left: 0;
	right: 0;
	z-index: 2;
}
.gantt-task-bar {
	position: absolute;
	display: flex;
	align-items: center;
	color: white;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	cursor: pointer;
	transition: transform 0.15s, box-shadow 0.15s;
}
.gantt-task-bar:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}
.bar-title {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
/* Anchor Handles styling */
.gantt-anchor {
	position: absolute;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background-color: #ffffff;
	border: 2px solid #1976D2;
	z-index: 4;
	cursor: crosshair;
	transition: transform 0.15s, background-color 0.15s, border-color 0.15s;
}
.gantt-anchor:hover {
	transform: scale(1.3);
	background-color: #1976D2;
}
.anchor-left {
	border-color: #2196F3;
}
.anchor-right {
	border-color: #4CAF50;
}
.anchor-highlight {
	transform: scale(1.5);
	background-color: #4CAF50 !important;
	border-color: #ffffff !important;
	box-shadow: 0 0 10px #4CAF50;
}
.anchor-active {
	background-color: #FF9800 !important;
	border-color: #ffffff !important;
}
/* SVG Dependency link interactions */
.dep-link-group {
	pointer-events: stroke;
	cursor: pointer;
}
.dep-delete-btn {
	pointer-events: all;
	cursor: pointer;
}
.dep-delete-btn circle {
	transition: r 0.15s ease, fill 0.15s ease;
}
.dep-delete-btn:hover circle {
	r: 12px;
	fill: #d32f2f;
}
</style>
