module.exports = {
	plugins: ['unicorn', 'sonarjs'],
	extends: ['xo', 'plugin:unicorn/all', 'plugin:sonarjs/recommended'],
	overrides: [
		{
			extends: ['xo-typescript'],
			files: ['*.ts', '*.tsx'],
		},
	],
	env: {
		es2022: true,
	},
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	rules: {
		'@typescript-eslint/restrict-plus-operands': 0,
		'@typescript-eslint/no-loop-func': 0,
		'unicorn/consistent-function-scoping': 0,
	},
};
