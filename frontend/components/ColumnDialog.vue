<template>
	<v-dialog v-model="showDialog" max-width="400px" @keydown.esc="closeDialog">
		<v-card>
			<v-card-title> Hidden Columns </v-card-title>
			<v-card-text>
				<v-form ref="formRef">
					<v-list-item v-for="c in activeColumns" :key="c.value">
						<v-list-item-content>
							<v-list-item-title> {{ c.text }} </v-list-item-title>
						</v-list-item-content>
						<v-list-item-action>
							<v-checkbox v-model="hiddenColumnsBuffer" :value="c.value" />
						</v-list-item-action>
					</v-list-item>
				</v-form>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import {
	computed,
	defineComponent,
	PropType,
	ref,
	useStore,
	watch,
} from "@nuxtjs/composition-api";
import { accessorType } from "../store";

export default defineComponent({
	props: {
		value: Boolean,
		activeColumns: {
			type: Array as PropType<Array<{ text: string; value: string }>>,
			required: true,
		},
	},

	setup(props, ctx) {
		const store = useStore<typeof accessorType>();

		const showDialog = computed({
			get: () => props.value,
			set: (val) => ctx.emit("input", val),
		});

		const closeDialog = () => {
			showDialog.value = false;
		};
		const hiddenColumnsBuffer = ref([...store.state.hiddenColumns]);
		watch(hiddenColumnsBuffer, (v) => {
			store.dispatch("updateHiddenColumns", v);
		});

		return {
			hiddenColumnsBuffer,
			showDialog,
			closeDialog,
		};
	},
});
</script>
