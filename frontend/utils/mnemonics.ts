export interface MnemonicMapping {
	key: string;
	itemKey: string;
	label?: string;
}

const SHORTCUT_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export class MnemonicGenerator {
	private usedKeys: Set<string> = new Set();

	constructor(reservedKeys: string[] = ['n', 's', 't', 'u', 'q', 'k']) {
		reservedKeys.forEach(k => this.usedKeys.add(k.toLowerCase()));
	}

	public reset(reservedKeys: string[] = ['n', 's', 't', 'u', 'q', 'k']) {
		this.usedKeys.clear();
		reservedKeys.forEach(k => this.usedKeys.add(k.toLowerCase()));
	}

	/**
	 * Generate a unique mnemonic for a given text or fallback to next available key combination
	 */
	public generateForText(text: string, itemKey: string): MnemonicMapping {
		const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, '');

		// Try single character from the text
		for (let i = 0; i < cleanText.length; i++) {
			const char = cleanText[i];
			if (!this.usedKeys.has(char)) {
				this.usedKeys.add(char);
				return { key: char, itemKey, label: text };
			}
		}

		// Try 2-character combinations from text
		if (cleanText.length >= 2) {
			for (let i = 0; i < cleanText.length - 1; i++) {
				const combo = cleanText.substring(i, i + 2);
				if (!this.usedKeys.has(combo)) {
					this.usedKeys.add(combo);
					return { key: combo, itemKey, label: text };
				}
			}
		}

		// Fallback to characters from SHORTCUT_CHARS
		for (let i = 0; i < SHORTCUT_CHARS.length; i++) {
			const char = SHORTCUT_CHARS[i];
			if (!this.usedKeys.has(char)) {
				this.usedKeys.add(char);
				return { key: char, itemKey, label: text };
			}
		}

		// Double character fallback
		for (let i = 0; i < SHORTCUT_CHARS.length; i++) {
			for (let j = 0; j < SHORTCUT_CHARS.length; j++) {
				const combo = SHORTCUT_CHARS[i] + SHORTCUT_CHARS[j];
				if (!this.usedKeys.has(combo)) {
					this.usedKeys.add(combo);
					return { key: combo, itemKey, label: text };
				}
			}
		}

		const fallback = `k${this.usedKeys.size}`;
		this.usedKeys.add(fallback);
		return { key: fallback, itemKey, label: text };
	}

	/**
	 * Generate mnemonics for an array of items with a name/label accessor
	 */
	public generateMap<T>(items: T[], keyAccessor: (item: T) => string, textAccessor: (item: T) => string): Map<string, string> {
		const result = new Map<string, string>(); // itemKey -> mnemonicKey
		items.forEach(item => {
			const itemKey = keyAccessor(item);
			const text = textAccessor(item);
			const mapping = this.generateForText(text, itemKey);
			result.set(itemKey, mapping.key);
		});
		return result;
	}
}
