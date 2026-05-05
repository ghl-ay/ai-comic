// server/app/providers/index.js
const OpenAIImageProvider = require('./openai');
const GrsaiImageProvider = require('./grsai');

const providers = {
  openai: OpenAIImageProvider,
  grsai: GrsaiImageProvider,
};

/**
 * 创建图片 Provider 实例
 * @param {string} format - API 格式标识 (openai, grsai)
 * @param {Object} config - 配置对象
 * @returns {BaseImageProvider}
 */
function createImageProvider(format, config) {
  const Provider = providers[format];
  if (!Provider) {
    throw new Error(`不支持的 API 格式: ${format}`);
  }
  return new Provider(config);
}

/**
 * 获取支持的 API 格式列表
 * @returns {string[]}
 */
function getSupportedFormats() {
  return Object.keys(providers);
}

module.exports = {
  createImageProvider,
  getSupportedFormats,
  providers,
};
