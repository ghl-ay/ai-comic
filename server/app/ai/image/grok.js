// server/app/ai/image/grok.js
// sub2api Grok 图片协议（基于实测契约）
// - 主路径：POST /v1/images/generations
// - 参考图：放在 generations body.image 数组（edits 在当前上游会 422）
// - async：多数实例未开启，默认不用
'use strict';

const BaseImageProtocol = require('./base');
const { referencesToUrlList } = require('../utils/reference');

class GrokImageProtocol extends BaseImageProtocol {
  // 实测 grok-imagine-image 对超长 prompt 返回 400（约 3600+ 字触发，留安全余量）
  static DEFAULT_MAX_PROMPT_LENGTH = 3200;

  constructor(config) {
    super(config);
    const extra = config.extra || {};
    this.pollIntervalMs = extra.pollIntervalMs || 2000;
    this.maxPollAttempts = extra.maxPollAttempts || 300;
    // 实测 sub2api 常返回 async image tasks are not enabled，默认关闭
    this.preferAsync = extra.preferAsync === true;
    this.maxPromptLength = Number(extra.maxPromptLength) > 0
      ? Number(extra.maxPromptLength)
      : GrokImageProtocol.DEFAULT_MAX_PROMPT_LENGTH;
  }

  /**
   * 截断过长 prompt，尽量保留开头结构与末尾绘制要求
   */
  truncatePrompt(prompt, maxLength = this.maxPromptLength) {
    if (typeof prompt !== 'string' || prompt.length <= maxLength) {
      return prompt;
    }

    const marker = '\n\n【绘制要求】';
    const markerIndex = prompt.lastIndexOf(marker);
    const suffix = markerIndex >= 0 ? prompt.slice(markerIndex) : '';
    const reserve = suffix.length + 40;
    const headBudget = Math.max(200, maxLength - reserve);
    const head = prompt.slice(0, headBudget);
    return `${head}\n\n…(提示词过长已截断)…${suffix}`.slice(0, maxLength);
  }

  normalizeBaseUrl() {
    return (this.config.baseUrl || '').replace(/\/+$/, '');
  }

  /**
   * 统一拼出 .../v1/images/... 路径
   */
  buildUrl(pathname) {
    let baseUrl = this.normalizeBaseUrl();
    // 去掉末尾 /v1，统一再拼
    baseUrl = baseUrl.replace(/\/v1$/i, '');
    let path = pathname.startsWith('/') ? pathname : `/${pathname}`;
    if (!path.startsWith('/v1/')) {
      path = `/v1${path}`;
    }
    return `${baseUrl}${path}`;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async requestJson(method, url, body) {
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    };

    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_) {
      payload = { raw: text };
    }

    if (!response.ok) {
      const message =
        payload.error?.message ||
        payload.message ||
        payload.msg ||
        (typeof payload.error === 'string' ? payload.error : null) ||
        text ||
        String(response.status);
      const error = new Error(`Grok 图片 API 失败: ${response.status} ${message}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  extractImageResult(payload) {
    if (!payload) {
      throw new Error('Grok 图片服务返回为空');
    }

    // OpenAI / xAI 风格: { data: [{ url | b64_json }] }
    if (payload.data && Array.isArray(payload.data) && payload.data[0]) {
      const image = payload.data[0];
      if (image.b64_json) {
        return { imageBuffer: Buffer.from(image.b64_json, 'base64') };
      }
      if (image.url) {
        return { imageUrl: image.url };
      }
    }

    const results = payload.results || payload.data?.results;
    if (Array.isArray(results) && results[0]?.url) {
      return { imageUrl: results[0].url };
    }

    if (payload.url) {
      return { imageUrl: payload.url };
    }

    throw new Error(`Grok 图片服务未返回可用图片: ${JSON.stringify(payload).slice(0, 300)}`);
  }

  extractTaskId(payload) {
    return (
      payload.task_id ||
      payload.taskId ||
      payload.id ||
      payload.data?.id ||
      payload.data?.task_id ||
      null
    );
  }

  isTaskLike(payload) {
    const status = payload.status || payload.data?.status;
    if (
      status &&
      ['queued', 'running', 'pending', 'processing', 'in_progress'].includes(String(status).toLowerCase())
    ) {
      return true;
    }
    // 有 task id 且没有直接图片
    const hasImage =
      (Array.isArray(payload.data) && payload.data[0] && (payload.data[0].url || payload.data[0].b64_json)) ||
      payload.url ||
      (payload.results && payload.results[0]?.url);
    return !!this.extractTaskId(payload) && !hasImage;
  }

  async pollTask(taskId) {
    const url = this.buildUrl(`/images/tasks/${taskId}`);

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      if (attempt > 0 && this.pollIntervalMs > 0) {
        await this.sleep(this.pollIntervalMs);
      }

      const payload = await this.requestJson('GET', url);

      const status = String(payload.status || payload.data?.status || '').toLowerCase();
      if (['succeeded', 'success', 'completed'].includes(status)) {
        return this.extractImageResult(payload.data || payload);
      }
      if (['failed', 'error'].includes(status)) {
        throw new Error(`Grok 生图失败: ${payload.error || payload.failure_reason || status}`);
      }

      try {
        return this.extractImageResult(payload.data || payload);
      } catch (_) {
        // keep polling
      }
    }

    throw new Error('Grok 生图任务超时');
  }

  /**
   * 构建请求体：只发上游认的字段，避免多余字段触发 400
   */
  buildBody({ model, prompt, size, references }) {
    const body = {
      model,
      prompt,
    };

    // size 可选；空或 auto 不传
    if (size && size !== 'auto') {
      body.size = size;
    }

    const imageList = referencesToUrlList(references);
    if (imageList.length > 0) {
      // 实测 generations + image[] 可用；不要同时塞 images
      body.image = imageList;
    }

    return body;
  }

  async callGenerations(body, { asyncMode = false } = {}) {
    const path = asyncMode ? '/v1/images/generations/async' : '/v1/images/generations';
    const url = this.buildUrl(path);
    const payload = await this.requestJson('POST', url, body);

    if (this.isTaskLike(payload)) {
      const taskId = this.extractTaskId(payload);
      if (!taskId) {
        throw new Error('Grok 异步任务未返回 task id');
      }
      return this.pollTask(taskId);
    }

    return this.extractImageResult(payload);
  }

  async generate(request) {
    const model = request.model || this.config.model;
    // 不强制 size：部分场景上游对固定 1024 更敏感；调用方未指定则省略
    const size = request.size;
    const references = request.references || [];

    let prompt = this.truncatePrompt(request.prompt, this.maxPromptLength);
    if (typeof request.prompt === 'string' && request.prompt.length > prompt.length) {
      // 截断信息留给服务日志侧（调用方 logger 会记 fail）
    }

    const attempt = async (nextPrompt) => {
      const body = this.buildBody({ model, prompt: nextPrompt, size, references });

      // 1) 若配置 preferAsync，先试 async（未开启则忽略）
      if (this.preferAsync) {
        try {
          return await this.callGenerations(body, { asyncMode: true });
        } catch (error) {
          // async 未开启等情况：继续同步
        }
      }

      // 2) 同步 generations（含参考图）
      try {
        return await this.callGenerations(body, { asyncMode: false });
      } catch (error) {
        // 3) 若带 size 失败，再试一次无 size
        if (body.size) {
          const retryBody = { ...body };
          delete retryBody.size;
          return this.callGenerations(retryBody, { asyncMode: false });
        }
        throw error;
      }
    };

    try {
      return await attempt(prompt);
    } catch (error) {
      // 4) 仍 400 时再缩短 prompt 重试一次（内容风控/长度边界）
      if (error.status === 400 && prompt.length > 1200) {
        const shorter = this.truncatePrompt(prompt, Math.min(1800, Math.floor(prompt.length * 0.55)));
        return attempt(shorter);
      }
      throw error;
    }
  }
}

module.exports = GrokImageProtocol;
