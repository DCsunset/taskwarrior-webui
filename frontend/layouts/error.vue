<template>
	<v-app>
		<h2 class="headline">
			{{ error.statusCode }}
		</h2>
		<div>
			{{ error.message }}
		</div>
		<NuxtLink to="/">
			Home page
		</NuxtLink>
	</v-app>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { NuxtError } from '@nuxt/types';

interface Props {
	error: NuxtError
};

export default defineComponent({
	layout: 'empty',
	props: {
		error: {
			type: Object
		}
	},
	data () {
		return {
			pageNotFound: '404 Not Found',
			otherError: 'An error occurred'
		};
	},

	setup(props: Props, _context) {
		return {
			error: props.error
		};
	}
});
</script>
