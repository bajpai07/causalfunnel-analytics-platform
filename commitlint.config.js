module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'perf'],
    ],
    'header-max-length': [2, 'always', 100],
    'body-required-for-feat-and-fix': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        'body-required-for-feat-and-fix': (parsed) => {
          const { type, body } = parsed
          if ((type === 'feat' || type === 'fix') && (!body || body.trim() === '')) {
            return [false, 'body is required for feat and fix commits']
          }
          return [true]
        },
      },
    },
  ],
}
