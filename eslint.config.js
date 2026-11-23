const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'android/**', 'ios/**', 'supabase/functions/**', 'coverage/**'],
  },
  {
    rules: {
      'import/order': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
