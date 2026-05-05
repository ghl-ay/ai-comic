// server/app/providers/grsai.js
const BaseImageProvider = require('./base');

class GrsaiImageProvider extends BaseImageProvider {
  static DEFAULT_POLL_INTERVAL_MS = 2000;
  static DEFAULT_MAX_POLL_ATTEMPTS = 300;

  constructor(config) {
    super(config);
    this.pollIntervalMs = config.pollIntervalMs || GrsaiImageProvider.DEFAULT_POLL_INTERVAL_MS;
    this.maxPollAttempts = config.maxPollAttempts || GrsaiImageProvider.DEFAULT_MAX_POLL_ATTEMPTS;
  }

  async generateImage(params) {
    const { prompt, referenceUrls = [] } = params;
    const { apiKey, baseUrl, model } = this.config;

    const result = await this.executeGrsaiDrawRequest({
      apiKey,
      baseUrl,
      model,
      prompt,
      referenceUrls,
    });

    return this.convertGrsaiResultToImageResponse(result);
  }

  async generateImageWithReference(params) {
    return this.generateImage(params);
  }

  buildGrsaiApiUrl(baseUrl, endpoint) {
    const normalized = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
    return `${normalized}/v1/draw/${endpoint}`;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async readJsonResponse(response) {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Grsai API request failed: ${response.status} ${text}`);
    }
    return await response.json();
  }

  extractGrsaiResultPayload(payload) {
    return payload.data && payload.data.status ? payload.data : payload;
  }

  convertGrsaiResultToImageResponse(result) {
    const firstUrl = result.url || (result.results && result.results[0] && result.results[0].url);
    if (!firstUrl) {
      throw new Error('Grsai 绘图结果中没有图片 URL');
    }

    return { imageUrl: firstUrl };
  }

  async executeGrsaiDrawRequest(params) {
    const { apiKey, baseUrl, model, prompt, referenceUrls = [] } = params;

    const completionsUrl = this.buildGrsaiApiUrl(baseUrl, 'completions');
    const resultUrl = this.buildGrsaiApiUrl(baseUrl, 'result');

    const requestBody = {
      model,
      prompt,
      aspectRatio: '1:1',
      webHook: '-1',
      shutProgress: false,
    };

    if (referenceUrls.length > 0) {
      requestBody.urls = referenceUrls;
    }

    const createPayload = await this.readJsonResponse(await fetch(completionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    }));

    const taskId = createPayload.data && createPayload.data.id;
    if (!taskId) {
      throw new Error(`Grsai 绘图任务创建失败: ${createPayload.msg || 'missing task id'}`);
    }

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      if (attempt > 0 && this.pollIntervalMs > 0) {
        await this.sleep(this.pollIntervalMs);
      }

      const resultPayload = await this.readJsonResponse(await fetch(resultUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: taskId }),
      }));

      if (resultPayload.code !== undefined && resultPayload.code !== 0) {
        throw new Error(`Grsai 绘图结果获取失败: ${resultPayload.msg || resultPayload.code}`);
      }

      const result = this.extractGrsaiResultPayload(resultPayload);
      if (result.status === 'succeeded') {
        return result;
      }

      if (result.status === 'failed') {
        throw new Error(`Grsai 绘图失败: ${result.error || result.failure_reason || 'unknown error'}`);
      }
    }

    throw new Error('Grsai 绘图任务超时');
  }
}

module.exports = GrsaiImageProvider;
