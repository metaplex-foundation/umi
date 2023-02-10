module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['airbnb-base', 'airbnb-typescript/base', 'prettier'],
  plugins: ['prettier'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-shadow': 'off',
    '@typescript-eslint/no-throw-literal': 'off',
    'class-methods-use-this': 'off',
    'import/no-cycle': 'off',
    'import/prefer-default-export': 'off',
    'max-classes-per-file': 'off',
    'no-param-reassign': 'off',
    'no-underscore-dangle': 'off',
  },
  ignorePatterns: ['.eslintrc.js', 'rollup.config.js', 'dist', 'configs'],
};
