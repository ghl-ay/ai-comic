// server/config/config.prod.js
exports.keys = process.env.EGG_KEYS;
exports.jwt = {
  secret: process.env.JWT_SECRET,
  expiresIn: '7d',
};
