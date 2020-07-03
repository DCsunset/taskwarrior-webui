module.exports = {
	root: true,
	env: {
		browser: true,
		node: true
	},
	extends: [
		'@nuxtjs',
		'plugin:nuxt/recommended',
		'@nuxtjs/eslint-config-typescript'
	],
	// add your custom rules here
	rules: {
		'brace-style': ['error', 'stroustrup'],
		semi: ['warn', 'always'],
		curly: 'off',
		'arrow-parens': 'off',
		'space-before-function-paren': 'off',
		'no-tabs': 'off',
		'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		'no-useless-escape': 'off',
		'spaced-comment': 'off',
		'no-unused-vars': 'warn',
		'require-await': 'warn',
		'no-trailing-spaces': 'warn',
		'no-throw-literal': 'warn',
		'new-cap': 'off',
		'indent': 'off',
		'@typescript-eslint/indent': ['warn', 'tab', { SwitchCase: 1 }],
		'no-useless-constructor': 'off',
		'@typescript-eslint/no-useless-constructor': 'error',
		'vue/html-indent': ['warn', 'tab', { closeBracket: 0 }],
		'vue/no-unused-components': 'warn',
		'vue/singleline-html-element-content-newline': 'off',
		'vue/attributes-order': 'off',
		'vue/no-v-html': 'off',
		'vue/html-self-closing': 'off',
		'vue/script-indent': 'off',
		'import/order': 'off',
		'import/no-mutable-exports': 'off',
		'object-curly-spacing': 'warn',
		'space-in-parens': 'off',
		'quote-props': 'off',
		'unicorn/number-literal-case': 'off',
		'no-new-func': 'off',
		'operator-linebreak': ['warn', 'before'],
		'camelcase': 'off',
		'import/no-webpack-loader-syntax': 'off'
	}
};
