// web/src/plugins/vuetify.js
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          background: '#f4f4f5',
          surface: '#ffffff',
          'on-background': '#18181b',
          'on-surface': '#18181b',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#818cf8',
          secondary: '#a78bfa',
          background: '#18181b',
          surface: '#27272a',
          'on-background': '#fafafa',
          'on-surface': '#fafafa',
        },
      },
    },
  },
})

export default vuetify
