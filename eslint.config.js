import globals from 'globals';

export default [
  {
    files: ['apps/web/src/**/*.{js,jsx}', 'services/*/src/**/*.js', 'packages/*/src/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.es2024,
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['apps/web/src/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, __VINLOOK_HOSTED_ROUTING__: 'readonly' },
    },
  },
  {
    files: ['services/*/src/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Routing modules are shared by Node build tools and browser Web Workers.
    files: ['packages/*/src/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
