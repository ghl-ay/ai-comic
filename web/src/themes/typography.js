// web/src/themes/typography.js
// 字体系统配置

// 字体族
export const fontFamily = {
  // 主字体 - 优先使用系统字体，提高加载速度
  sans: "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  
  // 等宽字体 - 用于代码显示
  mono: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
  
  // 艺术字体 - 用于标题和品牌
  display: "'Poppins', 'Noto Sans SC', sans-serif",
}

// 字号规范 (基于 16px 基准)
export const fontSize = {
  // 标题字号
  'h1': '2.5rem',      // 40px
  'h2': '2rem',        // 32px
  'h3': '1.75rem',     // 28px
  'h4': '1.5rem',      // 24px
  'h5': '1.25rem',     // 20px
  'h6': '1.125rem',    // 18px
  
  // 正文字号
  'body-lg': '1.125rem',   // 18px
  'body': '1rem',          // 16px
  'body-sm': '0.875rem',   // 14px
  'body-xs': '0.8125rem',  // 13px
  
  // 辅助字号
  'caption': '0.75rem',    // 12px
  'overline': '0.6875rem', // 11px
  
  // 按钮字号
  'button-lg': '1rem',
  'button': '0.875rem',
  'button-sm': '0.8125rem',
}

// 字重
export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
}

// 行高
export const lineHeight = {
  none: 1,
  tight: 1.2,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
  
  // 特定用途行高
  'heading': 1.2,
  'body': 1.5,
  'caption': 1.5,
}

// 字间距
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
  
  // 特定用途字间距
  'heading': '-0.025em',
  'body': '0',
  'caption': '0.025em',
  'overline': '0.1em',
}

// 排版组合
export const typography = {
  // 标题样式
  'h1': {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.heading,
    letterSpacing: letterSpacing.heading,
  },
  'h2': {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h2,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.heading,
    letterSpacing: letterSpacing.heading,
  },
  'h3': {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h3,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.heading,
    letterSpacing: letterSpacing.tight,
  },
  'h4': {
    fontFamily: fontFamily.display,
    fontSize: fontSize.h4,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.heading,
    letterSpacing: letterSpacing.tight,
  },
  'h5': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h5,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  'h6': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.h6,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  
  // 正文样式
  'body-lg': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['body-lg'],
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.body,
    letterSpacing: letterSpacing.body,
  },
  'body': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.body,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.body,
    letterSpacing: letterSpacing.body,
  },
  'body-sm': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['body-sm'],
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.body,
    letterSpacing: letterSpacing.body,
  },
  
  // 辅助样式
  'caption': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.caption,
    letterSpacing: letterSpacing.caption,
  },
  'overline': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.overline,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.caption,
    letterSpacing: letterSpacing.overline,
    textTransform: 'uppercase',
  },
  
  // 按钮样式
  'button-lg': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['button-lg'],
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
    letterSpacing: letterSpacing.wide,
    textTransform: 'none',
  },
  'button': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.button,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
    letterSpacing: letterSpacing.wide,
    textTransform: 'none',
  },
  'button-sm': {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['button-sm'],
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.none,
    letterSpacing: letterSpacing.wide,
    textTransform: 'none',
  },
}

// CSS 变量生成
export function generateTypographyCSSVariables() {
  const variables = {}
  
  // 字体族变量
  Object.entries(fontFamily).forEach(([key, value]) => {
    variables[`--font-family-${key}`] = value
  })
  
  // 字号变量
  Object.entries(fontSize).forEach(([key, value]) => {
    variables[`--font-size-${key}`] = value
  })
  
  // 字重变量
  Object.entries(fontWeight).forEach(([key, value]) => {
    variables[`--font-weight-${key}`] = value
  })
  
  // 行高变量
  Object.entries(lineHeight).forEach(([key, value]) => {
    variables[`--line-height-${key}`] = value
  })
  
  // 字间距变量
  Object.entries(letterSpacing).forEach(([key, value]) => {
    variables[`--letter-spacing-${key}`] = value
  })
  
  return variables
}

export default {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  typography,
  generateTypographyCSSVariables,
}
