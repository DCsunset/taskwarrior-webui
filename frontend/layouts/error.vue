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
import { defineComponent } from '@nuxtjs/composition-api';
import { NuxtError } from '@nuxt/types';

export default defineComponent({
	data () {
		return {
			pageNotFound: '404 Not Found',
			otherError: 'An error occurred'
		};
	},

	props: {
		error: {
			type: Object as () => NuxtError,
			required: true
		}
	},

	setup(props) {
		return {
			error: props.error
		};
	}
});
</script>
