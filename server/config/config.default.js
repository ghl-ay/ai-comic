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

exports.database = {
  path: './database/comic.db',
};
