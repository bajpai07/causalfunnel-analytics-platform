module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  ignorePatterns: ['node_modules/', 'dist/', '.next/', 'coverage/', 'packages/dashboard/public/tracker.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'eqeqeq': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
  },
}
