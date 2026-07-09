# Changelog

## [Unreleased]

### Added
- Issue/PR 模板（.github/）
- MIT 许可证

### Changed
- README 重写：添加技术栈徽章、截图平铺布局、精简内容

---

## [1.0.0] - 2026-05

### Added

#### 核心功能
- 用户注册/登录/登出，JWT 认证中间件
- 首个注册用户自动成为管理员
- 角色库 CRUD（含 AI 一键生成角色）
- 漫画/章节 CRUD（支持长篇和短篇漫画）
- AI 分镜脚本生成
- AI 漫画图片生成（策略模式支持多 Provider）
- 漫画预览与 PDF 导出
- 小说转漫画（上传小说 → AI 分析 → 批量创建章节 → 生成图片）

#### 后台管理
- 管理员权限中间件
- AI 模型配置（API Key / Base URL / 模型选择）
- 存储方案配置（本地 / 腾讯云 COS / 咸鱼云）

#### 前端
- Vue 3 + Vite + Vuetify 3 项目初始化
- Pinia 状态管理，Vue Router 路由守卫
- 多主题切换
- 响应式布局，移动端适配
- 漫画卡片/角色卡片统一高度，文本溢出省略
- 分镜脚本编辑（步骤向导）
- 风格预设选择器

#### 数据库
- SQLite（better-sqlite3）初始化
- users / characters / comics / chapters / novels / configs / ai_configs / style_presets 表

### Security
- 生产环境密钥通过环境变量设置
- 移除硬编码的敏感 URL
- 图片访问路径穿越修复
- 图片静态文件改为 Cookie 认证访问

### Fixed
- 用户不存在时 JWT 返回 401
- AI 返回内容的 JSON 解析健壮性
- 存储配置读取失败日志
- 导航栏激活状态 bug
- 移动端抽屉滚动泄露
- StepUpload 组件响应式问题

### Changed
- 图片存储从文件存储改为 base64 传输
- 角色参考图改为三视图
- 图片模型 Provider 策略模式重构
- 配置系统重构为通用 configs 表

---

## [0.1.0] - 2026-04

### Added
- Egg.js 后端项目初始化
- SQLite 数据库初始化
- Vue 3 + Vuetify 前端项目初始化
- 登录页面与漫画列表占位页
- 项目设计文档
