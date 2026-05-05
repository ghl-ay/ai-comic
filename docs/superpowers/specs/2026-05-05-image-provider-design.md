# 图片模型 Provider 策略模式重构设计

## 背景

当前图片生成服务 `ai-image.js` 混合了 OpenAI 和 grsai 两种实现，通过 `isGrsaiConfig()` 特判 provider/baseUrl 字符串来切换。代码耦合严重，扩展新提供商需要修改核心代码。

## 目标

- 解耦不同 API 格式的实现，各自独立文件
- 支持前端配置页面选择 API 格式
- 添加新提供商只需新建文件并注册，无需修改核心逻辑

## 架构设计

### 1. Provider 目录结构

```
server/app/providers/
├── index.js           # 注册表和工厂方法
├── base.js            # 抽象基类
├── openai.js          # OpenAI 实现
└── grsai.js           # grsai 实现
```

### 2. 基类定义 (base.js)

```javascript
class BaseImageProvider {
  constructor(config) {
    this.config = config;
  }

  // 必须由子类实现
  async generateImage(params) {
    throw new Error('必须实现 generateImage 方法');
  }

  // 可选重写：支持参考图的生成
  async generateImageWithReference(params) {
    return this.generateImage(params);
  }

  // 工具方法
  static downloadImage(url) { ... }
  static buildComicPagePrompt(params) { ... }
}
```

### 3. Provider 实现

**OpenAI (openai.js):**
- 使用 OpenAI SDK
- 支持图片编辑模式（带参考图）
- 支持 gpt-image 系列模型

**grsai (grsai.js):**
- 使用 fetch 调用 REST API
- 异步任务 + 轮询机制
- 支持参考图上传

### 4. 工厂方法 (index.js)

```javascript
const providers = {
  openai: OpenAIImageProvider,
  grsai: GrsaiImageProvider,
};

function createImageProvider(format, config) {
  const Provider = providers[format];
  if (!Provider) {
    throw new Error(`不支持的 API 格式: ${format}`);
  }
  return new Provider(config);
}

function getSupportedFormats() {
  return Object.keys(providers);
}
```

### 5. ai-image.js 简化

原有 475 行代码简化为约 100 行，主要职责：
- 获取配置
- 调用 `createImageProvider()` 创建 provider
- 调用 provider 方法生成图片
- 保存图片文件

## 数据库变更

**ai_configs 表新增字段：**

```sql
ALTER TABLE ai_configs ADD COLUMN api_format VARCHAR(20) DEFAULT 'openai';
```

**配置结构：**
```javascript
{
  type: 'image',
  provider: 'OpenAI',      // 显示名称
  apiFormat: 'openai',     // 策略标识：'openai' | 'grsai'
  apiKey: '...',
  baseUrl: '...',
  model: 'gpt-image-2'
}
```

## 前端变更

**AiConfig.vue 添加 API 格式选择：**

```html
<v-select
  v-model="imageForm.apiFormat"
  :items="apiFormatOptions"
  label="API 格式"
/>
```

```javascript
const apiFormatOptions = [
  { title: 'OpenAI', value: 'openai' },
  { title: 'GRS AI', value: 'grsai' },
];
```

**交互：**
1. 用户选择 API 格式
2. 表单显示对应格式的默认值提示
3. 保存时提交 `apiFormat` 字段

## 成功标准

1. 后端 provider 代码解耦，OpenAI 和 grsai 实现分离到独立文件
2. 前端配置页面可选择 API 格式
3. 添加新 provider 只需：新建文件 → 注册到 index.js → 无需修改 ai-image.js
4. 现有功能不受影响，测试通过
