import { Plugin } from '@nuxt/types';
import hotkeys from 'hotkeys-js';
import Vue from 'vue';

export const HotkeyBus = new Vue();

export interface HotkeyService {
	bind: typeof hotkeys;
	unbind: typeof hotkeys.unbind;
	setScope: typeof hotkeys.setScope;
	getScope: typeof hotkeys.getScope;
	bus: Vue;
}

declare module 'vue/types/vue' {
	interface Vue {
		$hotkeys: HotkeyService;
	}
}

declare module '@nuxt/types' {
	interface NuxtAppOptions {
		$hotkeys: HotkeyService;
	}
	interface Context {
		$hotkeys: HotkeyService;
	}
}

const hotkeysPlugin: Plugin = (context, inject) => {
	if (process.client) {
		hotkeys.filter = (event) => {
			const target = (event.target || event.srcElement) as HTMLElement | null;
			if (!target) return true;
			const tagName = target.tagName;
			if (target.isContentEditable || tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
				return event.key === 'Escape' || (event.ctrlKey && event.shiftKey && (event.key === 'K' || event.key === 'k'));
			}
			return true;
		};

		// Bind single key shortcuts
		hotkeys('u', (e) => {
			e.preventDefault();
			HotkeyBus.$emit('trigger-undo');
		});
		hotkeys('n', (e) => {
			e.preventDefault();
			HotkeyBus.$emit('trigger-new-task');
		});
		hotkeys('q', (e) => {
			e.preventDefault();
			HotkeyBus.$emit('trigger-custom-queries');
		});

		const hotkeyService: HotkeyService = {
			bind: hotkeys,
			unbind: hotkeys.unbind,
			setScope: hotkeys.setScope,
			getScope: hotkeys.getScope,
			bus: HotkeyBus
		};

		inject('hotkeys', hotkeyService);
	}
};

export default hotkeysPlugin;
