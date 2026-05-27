// web/src/themes/colors.js
// Material Design 3 风格颜色主题配置

export const lightTheme = {
  // 主色调
  primary: '#6366F1',      // Indigo 500
  secondary: '#8B5CF6',    // Violet 500
  accent: '#EC4899',       // Pink 500
  
  // 功能色
  error: '#EF4444',        // Red 500
  warning: '#F59E0B',      // Amber 500
  info: '#3B82F6',         // Blue 500
  success: '#10B981',      // Emerald 500
  
  // 背景色
  background: '#F8FAFC',   // Slate 50
  surface: '#FFFFFF',
  'surface-variant': '#F1F5F9', // Slate 100
  'surface-bright': '#FFFFFF',
  'surface-dim': '#F8FAFC',
  
  // 容器色
  'primary-container': '#E0E7FF', // Indigo 100
  'secondary-container': '#EDE9FE', // Violet 100
  'error-container': '#FEE2E2', // Red 100
  
  // 文本色
  'on-primary': '#FFFFFF',
  'on-secondary': '#FFFFFF',
  'on-error': '#FFFFFF',
  'on-background': '#1E293B', // Slate 800
  'on-surface': '#1E293B',
  'on-surface-variant': '#64748B', // Slate 500
  
  // 边框和分割线
  outline: '#E2E8F0', // Slate 200
  'outline-variant': '#F1F5F9', // Slate 100
  
  // 阴影
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // 状态层
  'state-hover': 'rgba(99, 102, 241, 0.08)',
  'state-focus': 'rgba(99, 102, 241, 0.12)',
  'state-pressed': 'rgba(99, 102, 241, 0.16)',
  'state-dragged': 'rgba(99, 102, 241, 0.2)',
}

export const darkTheme = {
  // 主色调
  primary: '#818CF8',      // Indigo 400
  secondary: '#A78BFA',    // Violet 400
  accent: '#F472B6',       // Pink 400
  
  // 功能色
  error: '#F87171',        // Red 400
  warning: '#FBBF24',      // Amber 400
  info: '#60A5FA',         // Blue 400
  success: '#34D399',      // Emerald 400
  
  // 背景色
  background: '#0F172A',   // Slate 900
  surface: '#1E293B',      // Slate 800
  'surface-variant': '#334155', // Slate 700
  'surface-bright': '#334155',
  'surface-dim': '#0F172A',
  
  // 容器色
  'primary-container': '#312E81', // Indigo 900
  'secondary-container': '#4C1D95', // Violet 900
  'error-container': '#7F1D1D', // Red 900
  
  // 文本色
  'on-primary': '#FFFFFF',
  'on-secondary': '#FFFFFF',
  'on-error': '#FFFFFF',
  'on-background': '#F8FAFC', // Slate 50
  'on-surface': '#F8FAFC',
  'on-surface-variant': '#94A3B8', // Slate 400
  
  // 边框和分割线
  outline: '#475569', // Slate 600
  'outline-variant': '#334155', // Slate 700
  
  // 阴影
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // 状态层
  'state-hover': 'rgba(129, 140, 248, 0.08)',
  'state-focus': 'rgba(129, 140, 248, 0.12)',
  'state-pressed': 'rgba(129, 140, 248, 0.16)',
  'state-dragged': 'rgba(129, 140, 248, 0.2)',
}

// 渐变色配置
export const gradients = {
  primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  secondary: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  accent: 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)',
  surface: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
  'surface-dark': 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
}

// 颜色工具函数
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export function lighten(color, amount) {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  const r = Math.min(255, rgb.r + amount)
  const g = Math.min(255, rgb.g + amount)
  const b = Math.min(255, rgb.b + amount)
  
  return rgbToHex(r, g, b)
}

export function darken(color, amount) {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  const r = Math.max(0, rgb.r - amount)
  const g = Math.max(0, rgb.g - amount)
  const b = Math.max(0, rgb.b - amount)
  
  return rgbToHex(r, g, b)
}

export function alpha(color, opacity) {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
}

export default {
  light: lightTheme,
  dark: darkTheme,
  gradients,
  hexToRgb,
  rgbToHex,
  lighten,
  darken,
  alpha,
}
