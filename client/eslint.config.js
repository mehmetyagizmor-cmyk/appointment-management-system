import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Bu proje boyunca standart "mount olunca veri çek" deseni kullanılıyor
      // (useEffect içinde setLoading(true) ile başlayan async fetch fonksiyonları).
      // Bu kural o yaygın deseni hatalı işaretliyor; bilinçli olarak kapatıldı.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
