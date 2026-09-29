// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'web-build/*',
      '.expo/*',
      'node_modules/*',
      // Deno runtime code (Supabase Edge Functions) is linted with `deno lint`.
      'supabase/functions/generate-replies/*',
      'supabase/functions/revenuecat-webhook/*',
    ],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]);
