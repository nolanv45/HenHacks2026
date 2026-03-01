module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['android/**', 'ios/**', 'node_modules/**'],
  rules: {
    'prettier/prettier': 'warn',
    'no-console': 'warn',
    'no-shadow': 'off',
    'react-hooks/rules-of-hooks': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-shadow': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
    ],
  },
};
