import { Plugin } from '@nuxt/types';

const axiosPlugin: Plugin = ({ $axios, store }) => {
	$axios.onRequest((config) => {
		const currentProfile = (store.state as any).currentProfile;
		if (currentProfile && currentProfile !== 'Default') {
			config.headers['X-Taskwarrior-Profile'] = currentProfile;
		}

		const currentContext = (store.state as any).currentContext;
		if (currentContext && currentContext !== 'none') {
			config.headers['X-Taskwarrior-Context'] = currentContext;
		}

		return config;
	});
};

export default axiosPlugin;
