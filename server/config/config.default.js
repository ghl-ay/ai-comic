// server/config/config.default.js
exports.keys = process.env.EGG_KEYS || 'CHANGE-ME-IN-PRODUCTION';

exports.cluster = {
  listen: {
    port: parseInt(process.env.SERVER_PORT || process.env.PORT, 10) || 7001,
    hostname: '0.0.0.0',
  },
};

exports.security = {
  csrf: {
    enable: false,
  },
};

exports.static = {
  prefix: '/',
};

exports.jwt = {
  secret: process.env.JWT_SECRET || 'CHANGE-ME-IN-PRODUCTION',
  expiresIn: '7d',
};

exports.cookie = {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
};

exports.tencentCos = {
  secretId: process.env.TENCENT_COS_SECRET_ID || '',
  secretKey: process.env.TENCENT_COS_SECRET_KEY || '',
  bucket: process.env.TENCENT_COS_BUCKET || '',
  region: process.env.TENCENT_COS_REGION || '',
  publicBaseUrl: process.env.TENCENT_COS_PUBLIC_BASE_URL || '',
  keyPrefix: process.env.TENCENT_COS_KEY_PREFIX || 'ai-print/reference',
};

exports.database = {
  path: process.env.DB_PATH || './database/comic.db',
};

// 角色参考图存储目录
exports.characterImageDir = 'public/images/characters';

// 漫画图片存储目录
exports.comicImageDir = 'public/images/comics';

// 风格预设示例图存储目录
exports.styleImageDir = 'public/images/styles';

// 数据库维护接口（/api/maintain）；未配置 token 时接口拒绝执行
exports.maintain = {
  token: process.env.MAINTAIN_TOKEN || '',
};

