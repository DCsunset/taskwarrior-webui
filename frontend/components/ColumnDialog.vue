<template>
	<v-dialog v-model="showDialog" max-width="400px" @keydown.esc="closeDialog">
		<v-card>
			<v-card-title> Visible Columns </v-card-title>
			<v-card-text>
				<v-form ref="formRef">
					<v-list-item v-for="c in activeColumns" :key="c.value">
						<v-list-item-content>
							<v-list-item-title> {{ c.text }} </v-list-item-title>
						</v-list-item-content>
						<v-list-item-action>
							<v-checkbox
								:value="!hiddenColumns.includes(c.value)"
								@change="handleChange(c.value)"
							/>
						</v-list-item-action>
					</v-list-item>
				</v-form>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import {
	watch,
	defineComponent,
	useStore,
	computed,
	ref,
	reactive,
	PropType,
} from "@nuxtjs/composition-api";
import { accessorType } from "../store";

export default defineComponent({
	props: {
		value: Boolean,
		activeColumns: Array as PropType<Array<{ text: String; value: String }>>,
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

		const handleChange = (value: string) => {
			if (store.state.hiddenColumns.includes(value)) {
				store.commit(
					"setHiddenColumns",
					store.state.hiddenColumns.filter((v) => v !== value)
				);
			} else {
				store.dispatch("updateHiddenColumns", [
					...store.state.hiddenColumns,
					value,
				]);
			}
		};

		return {
			showDialog,
			closeDialog,
			hiddenColumns: store.state.hiddenColumns,
			handleChange,
		};
	},
});
</script>
