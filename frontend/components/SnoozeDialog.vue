<template>
	<v-dialog v-model="internalValue" max-width="400" @click:outside="cancel">
		<v-card>
			<v-card-title class="headline">Snooze Task</v-card-title>
			<v-card-text>
				<div class="subtitle-1 mb-2">Quick Options</div>
				<v-row dense class="mb-4">
					<v-col cols="4" v-for="preset in presets" :key="preset.label">
						<v-btn small block outlined color="primary" @click="applyPreset(preset)">
							{{ preset.label }}
						</v-btn>
					</v-col>
				</v-row>
				
				<v-divider class="mb-4"></v-divider>
				
				<div class="subtitle-1 mb-2">Custom Date & Time</div>
				<v-text-field
					v-model="customDatetime"
					type="datetime-local"
					outlined
					dense
					hide-details
				></v-text-field>
				
				<div v-if="isPastDate" class="red--text text-caption mt-1">
					Cannot select a date in the past.
				</div>
			</v-card-text>
			
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn text color="grey" @click="cancel">Cancel</v-btn>
				<v-btn color="primary" @click="confirm" :disabled="!isValid">Confirm</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from '@nuxtjs/composition-api';
import moment from 'moment';

export default defineComponent({
	name: 'SnoozeDialog',
	props: {
		value: {
			type: Boolean,
			default: false
		}
	},
	setup(props, { emit }) {
		const internalValue = computed({
			get: () => props.value,
			set: (val) => {
				if (!val) emit('cancel');
			}
		});

		const customDatetime = ref<string>('');

		const presets = [
			{ label: '1 hour', getMoment: () => moment().add(1, 'hour') },
			{ label: '2 hours', getMoment: () => moment().add(2, 'hours') },
			{ label: '4 hours', getMoment: () => moment().add(4, 'hours') },
			{ label: 'Later Today', getMoment: () => {
				const today5pm = moment().hours(17).minutes(0).seconds(0);
				return moment().isAfter(today5pm) ? moment().add(2, 'hours') : today5pm;
			}},
			{ label: 'Tomorrow', getMoment: () => moment().add(1, 'day').hours(9).minutes(0).seconds(0) },
			{ label: 'This Weekend', getMoment: () => moment().day(6).hours(9).minutes(0).seconds(0) }, // Saturday 9am
			{ label: 'Next Week', getMoment: () => moment().add(1, 'weeks').startOf('isoWeek').hours(9).minutes(0).seconds(0) } // Monday 9am
		];

		const applyPreset = (preset: any) => {
			const targetMoment = preset.getMoment();
			// HTML5 datetime-local expects YYYY-MM-DDTHH:mm
			customDatetime.value = targetMoment.format('YYYY-MM-DDTHH:mm');
		};

		// When dialog opens, reset fields
		watch(() => props.value, (newVal) => {
			if (newVal) {
				customDatetime.value = '';
			}
		});

		const isPastDate = computed(() => {
			if (!customDatetime.value) return false;
			return moment(customDatetime.value).isBefore(moment());
		});

		const isValid = computed(() => {
			return !!customDatetime.value && !isPastDate.value;
		});

		const confirm = () => {
			if (isValid.value) {
				// Convert local datetime to UTC ISO string for Taskwarrior (YYYYMMDDTHHMMSSZ)
				const twDateString = moment(customDatetime.value).utc().format('YYYYMMDD[T]HHmmss[Z]');
				emit('confirm', twDateString);
			}
		};

		const cancel = () => {
			emit('cancel');
		};

		return {
			internalValue,
			customDatetime,
			presets,
			applyPreset,
			isPastDate,
			isValid,
			confirm,
			cancel
		};
	}
});
</script>
