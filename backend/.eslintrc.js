module.exports = {
	'env': {
		'commonjs': true,
		'es6': true,
		'node': true
	},
	'parser': '@typescript-eslint/parser',
	'extends': [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended'
	],
	'globals': {
		'Atomics': 'readonly',
		'SharedArrayBuffer': 'readonly'
	},
	'parserOptions': {
		'ecmaVersion': 2018
	},
	'rules': {
		'indent': 'off',
		'@typescript-eslint/indent': ['warn', 'tab', { SwitchCase: 1 }],
		'linebreak-style': [
			'error',
			'unix'
		],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		],
		'require-atomic-updates': 'off',
		'brace-style': ['error', 'stroustrup'],
		'no-throw-literal': 'error',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/no-explicit-any': 'off'
	}
};
