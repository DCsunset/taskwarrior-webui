<template>
	<div class="tw-datetime">
		<v-menu
			v-model="menu"
			:close-on-content-click="false"
			offset-y
			:nudge-bottom="4"
		>
			<template v-slot:activator="{ attrs }">
				<v-text-field
					:value="value"
					@input="v => $emit('input', v)"
					:label="label"
					:required="required"
					:rules="rules"
					prepend-inner-icon="mdi-calendar-blank-outline"
					@click:prepend-inner="menu = true"
					v-bind="attrs"
				/>
			</template>

			<v-card class="tw-datetime-pop">
				<v-date-picker
					v-model="draftDate"
					no-title
					:first-day-of-week="1"
					color="primary"
				/>

				<v-divider />

				<div v-if="showTime" class="tw-datetime-time">
					<v-btn
						v-if="!timeActive"
						text
						small
						block
						class="tw-datetime-time__toggle"
						@click="openTime"
					>
						<v-icon small left>mdi-clock-outline</v-icon>
						Hora
					</v-btn>
					<div v-else class="tw-datetime-time__row">
						<v-icon small class="mr-2">mdi-clock-outline</v-icon>
						<input
							ref="timeInputRef"
							type="time"
							v-model="draftTime"
							class="tw-datetime-time__input"
						/>
						<v-btn icon x-small @click="draftTime = ''; timeActive = false">
							<v-icon small>mdi-close</v-icon>
						</v-btn>
					</div>
				</div>

				<v-divider v-if="showTime" />

				<v-card-actions class="tw-datetime-actions">
					<v-btn v-if="value" text x-small @click="clear">Clear</v-btn>
					<v-spacer />
					<v-btn text x-small @click="menu = false">Cancel</v-btn>
					<v-btn text x-small color="primary" @click="apply">OK</v-btn>
				</v-card-actions>
			</v-card>
		</v-menu>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick } from '@nuxtjs/composition-api';
import moment from 'moment';

export default defineComponent({
	props: {
		value: { type: String, default: '' },
		label: { type: String, default: '' },
		required: { type: Boolean, default: false },
		rules: { type: Array, default: () => [] },
		showTime: { type: Boolean, default: false }
	},
	setup(props, ctx) {
		const menu = ref(false);
		const timeActive = ref(false);
		const timeInputRef = ref<HTMLInputElement | null>(null);

		const openTime = async () => {
			timeActive.value = true;
			await nextTick();
			const el = timeInputRef.value;
			if (el) {
				el.focus();
				if (typeof el.showPicker === 'function') {
					try {
						el.showPicker();
					}
					catch (_) { /* ignore */ }
				}
			}
		};

		const parseDate = (str: string): moment.Moment | null => {
			if (!str) return null;
			const m = moment(str, [
				moment.ISO_8601,
				'YYYYMMDD[T]HHmmss[Z]',
				'YYYYMMDD[T]HHmmss',
				'YYYY-MM-DD HH:mm:ss',
				'YYYY-MM-DD HH:mm',
				'YYYY-MM-DD',
				'YYYY/MM/DD',
				'DD/MM/YYYY',
				'MM/DD/YYYY'
			], true);
			return m.isValid() ? m : null;
		};

		const draftDate = ref<string | null>(null);
		const draftTime = ref<string>('');

		const syncDraft = () => {
			const parsed = parseDate(props.value);
			if (parsed) {
				draftDate.value = parsed.format('YYYY-MM-DD');
				const t = parsed.format('HH:mm');
				if (t !== '00:00') {
					draftTime.value = t;
					timeActive.value = true;
				}
				else {
					draftTime.value = '';
					timeActive.value = false;
				}
			}
			else {
				draftDate.value = null;
				draftTime.value = '';
				timeActive.value = false;
			}
		};

		watch(menu, open => {
			if (open) syncDraft();
		});

		const apply = () => {
			if (!draftDate.value) {
				menu.value = false;
				return;
			}
			let out = draftDate.value;
			if (props.showTime && draftTime.value) {
				out = `${draftDate.value}T${draftTime.value}:00`;
			}
			ctx.emit('input', out);
			menu.value = false;
		};

		const clear = () => {
			ctx.emit('input', '');
			menu.value = false;
		};

		return { menu, timeActive, timeInputRef, draftDate, draftTime, openTime, apply, clear };
	}
});
</script>

<style scoped>
.tw-datetime {
	flex: 1 1 auto;
	min-width: 0;
}

.tw-datetime-pop {
	width: 268px;
	border-radius: 8px;
	overflow: hidden;
}

.tw-datetime-pop ::v-deep .v-picker,
.tw-datetime-pop ::v-deep .v-picker__body {
	width: 100% !important;
	max-width: 100% !important;
	box-shadow: none !important;
}

/* Compact calendar grid */
.tw-datetime-pop ::v-deep .v-date-picker-header {
	padding: 4px 6px;
}
.tw-datetime-pop ::v-deep .v-date-picker-header .v-btn {
	height: 28px;
	width: 28px;
}
.tw-datetime-pop ::v-deep .v-date-picker-header__value {
	font-size: 13px;
	font-weight: 500;
}
.tw-datetime-pop ::v-deep .v-date-picker-table {
	height: auto;
	padding: 0 6px 6px;
}
.tw-datetime-pop ::v-deep .v-date-picker-table th {
	font-size: 11px;
	padding: 4px 0;
	height: auto;
	font-weight: 500;
}
.tw-datetime-pop ::v-deep .v-date-picker-table td {
	padding: 0;
}
.tw-datetime-pop ::v-deep .v-date-picker-table .v-btn {
	height: 28px;
	width: 28px;
	min-width: 28px;
	font-size: 12px;
	font-weight: 400;
}

.tw-datetime-time {
	padding: 6px 8px;
	min-height: 40px;
	display: flex;
	align-items: center;
}
.tw-datetime-time__toggle {
	justify-content: flex-start !important;
	text-transform: none !important;
	font-weight: 400 !important;
	letter-spacing: 0 !important;
	color: rgba(0, 0, 0, 0.6) !important;
}
.tw-datetime-time__row {
	display: flex;
	align-items: center;
	width: 100%;
	padding: 0 6px;
}
.tw-datetime-time__input {
	flex: 1 1 auto;
	border: none;
	outline: none;
	font-size: 14px;
	background: transparent;
	font-family: inherit;
	padding: 4px 0;
}

.tw-datetime-actions {
	padding: 4px 8px;
	min-height: 36px;
}
.tw-datetime-actions .v-btn {
	text-transform: none !important;
	letter-spacing: 0 !important;
	font-weight: 500 !important;
}

.theme--dark .tw-datetime-time__toggle {
	color: rgba(255, 255, 255, 0.7) !important;
}
</style>
