const BaseProvider = require('./base');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const DEFAULT_API_BASE_URL = 'https://your-api-server.example.com';
const DEFAULT_PUBLIC_BASE_URL = 'https://your-image-server.example.com';

class XyyCloudProvider extends BaseProvider {
  constructor(ctx, config) {
    super(ctx, config);
    this.name = 'xyy-cloud';
    this.token = null;
    this.uid = null;
  }

  isConfigured() {
    return Boolean(this.config.username && this.config.password);
  }

  get apiBaseUrl() {
    return this.config.apiBaseUrl || DEFAULT_API_BASE_URL;
  }

  get publicBaseUrl() {
    return this.config.publicBaseUrl || DEFAULT_PUBLIC_BASE_URL;
  }

  async login() {
    // 获取 token
    const tokenRes = await axios.get(`${this.apiBaseUrl}/api/user/token`, {
      params: {
        user: this.config.username,
        passwd: this.config.password,
      },
    });

    if (tokenRes.data.code !== 200) {
      throw new Error(tokenRes.data.msg || '咸鱼云登录失败');
    }

    this.token = tokenRes.data.data;

    // 获取用户信息
    const userRes = await axios.get(`${this.apiBaseUrl}/api/user`, {
      headers: { Token: this.token },
    });

    if (userRes.data.code !== 200) {
      throw new Error(userRes.data.msg || '获取用户信息失败');
    }

    this.uid = userRes.data.data.id;
  }

  async upload(buffer, originalName) {
    if (!this.isConfigured()) {
      throw new Error('咸鱼云存储配置不完整');
    }

    // 确保已登录
    if (!this.token || !this.uid) {
      await this.login();
    }

    const filename = path.basename(this.generateFilename(buffer, originalName, 'images'));
    const form = new FormData();
    form.append('file', buffer, filename);
    form.append('mtime', Date.now().toString());

    const uploadUrl = `${this.apiBaseUrl}/api/diskFile/${this.uid}/file/images`;

    try {
      const resp = await axios.put(uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          Token: this.token,
        },
      });

      return `${this.publicBaseUrl}/${filename}`;
    } catch (err) {
      // token 过期时清除状态
      if (err.response?.status === 401 || err.response?.status === 403) {
        this.token = null;
        this.uid = null;
      }
      throw new Error(`咸鱼云上传失败: ${err.response?.data?.msg || err.message}`);
    }
  }
}

module.exports = XyyCloudProvider;
