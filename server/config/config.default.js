// server/config/config.default.js
exports.keys = 'CHANGE-ME-IN-PRODUCTION';

exports.security = {
  csrf: {
    enable: false,
  },
};

exports.jwt = {
  secret: 'CHANGE-ME-IN-PRODUCTION',
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
  path: './database/comic.db',
};

// 角色参考图存储目录
exports.characterImageDir = 'public/images/characters';

// 漫画图片存储目录
exports.comicImageDir = 'public/images/comics';

