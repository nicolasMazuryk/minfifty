module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:import/typescript',
  ],
  ignorePatterns: ['.eslintrc.js', 'build/**/*.js'],
  overrides: [
    {
      files: ['.eslintrc.js'],
      rules: {
        'sort-keys-fix/sort-keys-fix': [
          'error',
          'asc',
          {
            caseSensitive: false,
          },
        ],
      },
    },
    {
      files: ['tests/**/*'],
      parserOptions: {
        project: 'tests/tsconfig.json',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    project: './tsconfig.json',
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import', 'sort-keys-fix'],
  root: true,
  rules: {
    '@typescript-eslint/default-param-last': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: false }],
    'arrow-body-style': ['error', 'as-needed'],
    'import/no-useless-path-segments': [
      'error',
      {
        noUselessIndex: true,
      },
    ],
    'import/order': [
      'error',
      {
        alphabetize: {
          caseInsensitive: true,
          order: 'asc',
        },
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
        pathGroups: [
          {
            group: 'internal',
            pattern: '@/**',
            position: 'before',
          },
        ],
        'newlines-between': 'always',
        warnOnUnassignedImports: true,
      },
    ],
    'linebreak-style': ['error', 'unix'],
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-negated-condition': 'error',
    'prefer-const': 'error',
    'prefer-object-spread': 'error',
  },
}
