const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
	{
		ignores: ['dist/**/*', 'node_modules/**/*'],
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			sourceType: 'module',
			ecmaVersion: 2019,
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'prefer-const': 'error',
			'no-var': 'error',
		},
	},
];
