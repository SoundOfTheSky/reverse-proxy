module.exports = {
	plugins: ['unicorn', 'sonarjs'],
	extends: ['xo', 'plugin:unicorn/recommended', 'plugin:sonarjs/recommended'],
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
	rules: {},
};
