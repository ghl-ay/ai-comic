// server/app/service/ai-provider.js
const Service = require('egg').Service;
const axios = require('axios');
const {
  getSupportedTextProtocols,
  getSupportedImageProtocols,
} = require('../ai/registry');
const { WORKFLOW_TEMPLATES, autoMatchWorkflow } = require('../ai/image/comfyui-templates');

class AiProviderService extends Service {
  get textProtocols() {
    return new Set(getSupportedTextProtocols());
  }

  get imageProtocols() {
    return new Set(getSupportedImageProtocols());
  }

  maskApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return '';
    if (apiKey.length <= 8) return '****';
    return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`;
  }

  parseExtra(extra) {
    if (!extra) return {};
    if (typeof extra === 'object') return extra;
    try {
      return JSON.parse(extra);
    } catch (_) {
      return {};
    }
  }

  toPublic(row, { includeBaseUrl = false } = {}) {
    if (!row) return null;
    const item = {
      id: row.id,
      type: row.type,
      name: row.name,
      protocol: row.protocol,
      model: row.model,
      enabled: !!row.enabled,
      isDefault: !!row.is_default,
      extra: this.parseExtra(row.extra),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      apiKeyMasked: this.maskApiKey(row.api_key),
    };
    if (includeBaseUrl) {
      item.baseUrl = row.base_url;
    }
    return item;
  }

  toRuntimeConfig(row) {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      protocol: row.protocol,
      apiKey: row.api_key,
      baseUrl: row.base_url,
      model: row.model,
      enabled: !!row.enabled,
      isDefault: !!row.is_default,
      extra: this.parseExtra(row.extra),
    };
  }

  validatePayload(data, { isCreate = false } = {}) {
    const { type, name, protocol, baseUrl, model, apiKey, enabled, isDefault, extra } = data;

    if (!type || !['text', 'image'].includes(type)) {
      this.ctx.throw(400, 'type 必须为 text 或 image');
    }
    if (!name || !String(name).trim()) {
      this.ctx.throw(400, '请填写提供商名称');
    }
    if (!protocol) {
      this.ctx.throw(400, '请选择协议');
    }
    if (type === 'text' && !this.textProtocols.has(protocol)) {
      this.ctx.throw(400, `文本协议仅支持: ${[...this.textProtocols].join(', ')}`);
    }
    if (type === 'image' && !this.imageProtocols.has(protocol)) {
      this.ctx.throw(400, `图片协议仅支持: ${[...this.imageProtocols].join(', ')}`);
    }
    if (!baseUrl || !String(baseUrl).trim()) {
      this.ctx.throw(400, '请填写 API 地址');
    }

    const isComfyUI = protocol === 'comfyui';

    if (!isComfyUI && (!model || !String(model).trim())) {
      this.ctx.throw(400, '请填写模型名称');
    }
    if (isCreate && !isComfyUI && (!apiKey || !String(apiKey).trim())) {
      this.ctx.throw(400, '请填写 API Key');
    }

    const isEnabled = enabled === undefined ? true : !!enabled;
    // 禁用项不得作为默认
    let nextIsDefault = !!isDefault;
    if (!isEnabled) {
      nextIsDefault = false;
    }

    return {
      type,
      name: String(name).trim(),
      protocol,
      baseUrl: String(baseUrl).trim().replace(/\/+$/, ''),
      model: model !== undefined && model !== null ? String(model).trim() : (isComfyUI ? 'auto' : ''),
      apiKey: apiKey !== undefined && apiKey !== null ? String(apiKey).trim() : '',
      enabled: isEnabled,
      isDefault: nextIsDefault,
      extra: extra && typeof extra === 'object' ? extra : {},
    };
  }

  listProviders({ type } = {}) {
    const db = this.app.db;
    let rows;
    if (type) {
      rows = db.prepare(
        `SELECT * FROM ai_configs
         WHERE user_id IS NULL AND type = ?
         ORDER BY is_default DESC, id ASC`
      ).all(type);
    } else {
      rows = db.prepare(
        `SELECT * FROM ai_configs
         WHERE user_id IS NULL AND type IN ('text', 'image')
         ORDER BY type ASC, is_default DESC, id ASC`
      ).all();
    }
    return rows.map(row => this.toPublic(row, { includeBaseUrl: true }));
  }

  listOptions(type) {
    if (!type || !['text', 'image'].includes(type)) {
      this.ctx.throw(400, 'type 必须为 text 或 image');
    }
    const rows = this.app.db.prepare(
      `SELECT id, name, protocol, model, is_default
       FROM ai_configs
       WHERE user_id IS NULL AND type = ? AND enabled = 1
       ORDER BY is_default DESC, id ASC`
    ).all(type);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      protocol: row.protocol,
      model: row.model,
      isDefault: !!row.is_default,
    }));
  }

  getById(id) {
    const row = this.app.db.prepare(
      `SELECT * FROM ai_configs WHERE id = ? AND user_id IS NULL AND type IN ('text', 'image')`
    ).get(id);
    return row || null;
  }

  getPublicById(id) {
    const row = this.getById(id);
    if (!row) this.ctx.throw(404, '提供商不存在');
    return this.toPublic(row, { includeBaseUrl: true });
  }

  clearDefault(type) {
    this.app.db.prepare(
      `UPDATE ai_configs SET is_default = 0, updated_at = CURRENT_TIMESTAMP
       WHERE user_id IS NULL AND type = ?`
    ).run(type);
  }

  ensureDefaultExists(type) {
    const db = this.app.db;
    const currentDefault = db.prepare(
      `SELECT id FROM ai_configs
       WHERE user_id IS NULL AND type = ? AND is_default = 1 AND enabled = 1`
    ).get(type);
    if (currentDefault) return;

    // 清掉可能存在的「禁用默认」脏数据
    db.prepare(
      `UPDATE ai_configs SET is_default = 0, updated_at = CURRENT_TIMESTAMP
       WHERE user_id IS NULL AND type = ? AND is_default = 1`
    ).run(type);

    const fallback = db.prepare(
      `SELECT id FROM ai_configs
       WHERE user_id IS NULL AND type = ? AND enabled = 1
       ORDER BY id ASC LIMIT 1`
    ).get(type);
    if (fallback) {
      db.prepare(
        `UPDATE ai_configs SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(fallback.id);
    }
  }

  createProvider(data) {
    const payload = this.validatePayload(data, { isCreate: true });
    const db = this.app.db;

    const run = db.transaction(() => {
      const existingCount = db.prepare(
        `SELECT COUNT(*) AS count FROM ai_configs
         WHERE user_id IS NULL AND type = ?`
      ).get(payload.type).count;

      // 首个提供商若启用则自动默认；禁用的首个不设默认
      const shouldDefault =
        payload.enabled && (payload.isDefault || existingCount === 0);

      if (shouldDefault) {
        this.clearDefault(payload.type);
      }

      const result = db.prepare(
        `INSERT INTO ai_configs
          (user_id, type, name, protocol, provider, api_key, base_url, model, enabled, is_default, extra)
         VALUES (NULL, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)`
      ).run(
        payload.type,
        payload.name,
        payload.protocol,
        payload.apiKey,
        payload.baseUrl,
        payload.model,
        payload.enabled ? 1 : 0,
        shouldDefault ? 1 : 0,
        JSON.stringify(payload.extra || {})
      );

      if (!shouldDefault) {
        this.ensureDefaultExists(payload.type);
      }

      return result.lastInsertRowid;
    });

    return this.getPublicById(run());
  }

  updateProvider(id, data) {
    const existing = this.getById(id);
    if (!existing) this.ctx.throw(404, '提供商不存在');

    const merged = {
      type: existing.type,
      name: data.name !== undefined ? data.name : existing.name,
      protocol: data.protocol !== undefined ? data.protocol : existing.protocol,
      baseUrl: data.baseUrl !== undefined ? data.baseUrl : existing.base_url,
      model: data.model !== undefined ? data.model : existing.model,
      apiKey: data.apiKey,
      enabled: data.enabled !== undefined ? data.enabled : !!existing.enabled,
      isDefault: data.isDefault !== undefined ? data.isDefault : !!existing.is_default,
      extra: data.extra !== undefined ? data.extra : this.parseExtra(existing.extra),
    };

    const payload = this.validatePayload(merged, { isCreate: false });
    const nextApiKey = payload.apiKey && payload.apiKey.trim()
      ? payload.apiKey.trim()
      : existing.api_key;

    const db = this.app.db;
    db.transaction(() => {
      if (payload.isDefault && payload.enabled) {
        this.clearDefault(payload.type);
      }

      db.prepare(
        `UPDATE ai_configs SET
          name = ?, protocol = ?, provider = '', api_key = ?, base_url = ?, model = ?,
          enabled = ?, is_default = ?, extra = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(
        payload.name,
        payload.protocol,
        nextApiKey,
        payload.baseUrl,
        payload.model,
        payload.enabled ? 1 : 0,
        payload.isDefault && payload.enabled ? 1 : 0,
        JSON.stringify(payload.extra || {}),
        id
      );

      this.ensureDefaultExists(payload.type);
    })();

    return this.getPublicById(id);
  }

  setDefault(id) {
    const existing = this.getById(id);
    if (!existing) this.ctx.throw(404, '提供商不存在');
    if (!existing.enabled) this.ctx.throw(400, '无法将已禁用的提供商设为默认');

    const db = this.app.db;
    db.transaction(() => {
      this.clearDefault(existing.type);
      db.prepare(
        `UPDATE ai_configs SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(id);
    })();

    return this.getPublicById(id);
  }

  deleteProvider(id) {
    const existing = this.getById(id);
    if (!existing) this.ctx.throw(404, '提供商不存在');

    const db = this.app.db;
    db.transaction(() => {
      db.prepare('DELETE FROM ai_configs WHERE id = ?').run(id);
      this.ensureDefaultExists(existing.type);
    })();

    return { success: true };
  }

  /**
   * 解析运行时提供商（带密钥）
   * @param {'text'|'image'} type
   * @param {number|string|null} providerId
   */
  resolve(type, providerId = null) {
    if (!type || !['text', 'image'].includes(type)) {
      this.ctx.throw(400, 'type 必须为 text 或 image');
    }

    const db = this.app.db;
    let row = null;

    if (providerId !== null && providerId !== undefined && providerId !== '') {
      const id = parseInt(providerId, 10);
      if (Number.isNaN(id)) {
        this.ctx.throw(400, 'providerId 无效');
      }
      row = db.prepare(
        `SELECT * FROM ai_configs
         WHERE id = ? AND user_id IS NULL AND type = ?`
      ).get(id, type);
      if (!row) {
        this.ctx.throw(400, '指定的提供商不存在或不匹配当前功能类型');
      }
      if (!row.enabled) {
        this.ctx.throw(400, '指定的提供商已禁用');
      }
      return this.toRuntimeConfig(row);
    }

    row = db.prepare(
      `SELECT * FROM ai_configs
       WHERE user_id IS NULL AND type = ? AND is_default = 1 AND enabled = 1
       ORDER BY id ASC LIMIT 1`
    ).get(type);

    if (!row) {
      row = db.prepare(
        `SELECT * FROM ai_configs
         WHERE user_id IS NULL AND type = ? AND enabled = 1
         ORDER BY id ASC LIMIT 1`
      ).get(type);
      if (row) {
        this.ctx.logger.warn(`[ai-provider] type=${type} 无默认项，回退到 id=${row.id}`);
      }
    }

    if (!row) {
      this.ctx.throw(503, 'AI 服务未配置，请联系管理员在后台添加提供商');
    }

    return this.toRuntimeConfig(row);
  }

  /**
   * 一键获取远程提供商大模型列表
   */
  async fetchRemoteModels(params) {
    const { protocol, baseUrl, apiKey, type } = params;
    if (!baseUrl || !String(baseUrl).trim()) {
      this.ctx.throw(400, '请先填写 API 地址');
    }

    const cleanBaseUrl = String(baseUrl).trim().replace(/\/+$/, '');
    const cleanApiKey = apiKey ? String(apiKey).trim() : '';

    const isComfy = protocol === 'comfyui' || (type === 'image' && cleanBaseUrl.includes(':8188')) || cleanBaseUrl.toLowerCase().includes('comfy');

    if (isComfy) {
      return this.inspectComfyUI({ baseUrl: cleanBaseUrl, apiKey: cleanApiKey });
    }

    if (protocol === 'anthropic') {
      try {
        const url = cleanBaseUrl.endsWith('/v1')
          ? `${cleanBaseUrl}/models`
          : `${cleanBaseUrl}/v1/models`;
        const res = await axios.get(url, {
          headers: {
            'x-api-key': cleanApiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 10000,
        });
        const models = (res.data?.data || []).map(m => m.id || m.name).filter(Boolean);
        if (models.length > 0) {
          return { models, total: models.length };
        }
      } catch (err) {
        // 部分 Anthropic 中转代理未实现 models 接口，返回预设常用模型列表
      }
      return {
        models: [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
        ],
        fallback: true,
      };
    }

    if (protocol === 'grok') {
      try {
        const url = cleanBaseUrl.endsWith('/v1')
          ? `${cleanBaseUrl}/models`
          : `${cleanBaseUrl}/v1/models`;
        const res = await axios.get(url, {
          headers: cleanApiKey ? { Authorization: `Bearer ${cleanApiKey}` } : {},
          timeout: 10000,
        });
        const models = (res.data?.data || []).map(m => m.id || m.name).filter(Boolean);
        if (models.length > 0) {
          return { models, total: models.length };
        }
      } catch (err) {
        // fallback
      }
      return {
        models: [
          'grok-imagine-image',
          'grok-2-vision-1212',
          'grok-2-image',
          'grok-beta',
        ],
        fallback: true,
      };
    }

    // OpenAI 兼容协议 (OpenAI / DeepSeek / Ollama / SiliconFlow / OpenRouter / Moonshot / etc.)
    try {
      const url = cleanBaseUrl.endsWith('/v1')
        ? `${cleanBaseUrl}/models`
        : `${cleanBaseUrl}/v1/models`;

      const headers = {};
      if (cleanApiKey) {
        headers.Authorization = cleanApiKey.startsWith('Bearer ')
          ? cleanApiKey
          : `Bearer ${cleanApiKey}`;
      }

      const res = await axios.get(url, {
        headers,
        timeout: 12000,
      });

      let rawList = [];
      if (Array.isArray(res.data)) {
        rawList = res.data;
      } else if (Array.isArray(res.data?.data)) {
        rawList = res.data.data;
      } else if (Array.isArray(res.data?.models)) {
        // Ollama native api format: { models: [{ name: '...' }] }
        rawList = res.data.models;
      }

      const models = rawList
        .map(item => (typeof item === 'string' ? item : item.id || item.name))
        .filter(Boolean);

      // 按类型做智能推荐排序或筛选
      if (type === 'image') {
        models.sort((a, b) => {
          const aImg = a.toLowerCase().includes('image') || a.toLowerCase().includes('dall-e') || a.toLowerCase().includes('flux');
          const bImg = b.toLowerCase().includes('image') || b.toLowerCase().includes('dall-e') || b.toLowerCase().includes('flux');
          if (aImg && !bImg) return -1;
          if (!aImg && bImg) return 1;
          return a.localeCompare(b);
        });
      } else {
        models.sort((a, b) => a.localeCompare(b));
      }

      return {
        models,
        total: models.length,
      };
    } catch (err) {
      this.ctx.logger.warn('[ai-provider] 获取模型列表失败:', err.message);
      this.ctx.throw(502, `获取模型列表失败 (${cleanBaseUrl}): ${err.response?.data?.error?.message || err.message}`);
    }
  }

  /**
   * 一键测试连接与可用性探测
   */
  async testConnection(params) {
    const { protocol, baseUrl, apiKey, type, model } = params;
    if (!baseUrl || !String(baseUrl).trim()) {
      this.ctx.throw(400, '请先填写 API 地址');
    }

    const cleanBaseUrl = String(baseUrl).trim().replace(/\/+$/, '');
    const cleanApiKey = apiKey ? String(apiKey).trim() : '';
    const startTime = Date.now();

    const isComfy = protocol === 'comfyui' || (type === 'image' && cleanBaseUrl.includes(':8188')) || cleanBaseUrl.toLowerCase().includes('comfy');

    if (isComfy) {
      const headers = {};
      if (cleanApiKey) {
        headers.Authorization = cleanApiKey.startsWith('Bearer ') ? cleanApiKey : `Bearer ${cleanApiKey}`;
      }

      try {
        // 多维度并发探测 ComfyUI：/system_stats, /queue, /prompt, /object_info
        const [statsRes, queueRes, objectInfoRes] = await Promise.allSettled([
          axios.get(`${cleanBaseUrl}/system_stats`, { headers, timeout: 6000 }),
          axios.get(`${cleanBaseUrl}/queue`, { headers, timeout: 6000 }),
          axios.get(`${cleanBaseUrl}/object_info`, { headers, timeout: 12000 }),
        ]);

        const latencyMs = Date.now() - startTime;

        const isAnySuccess = statsRes.status === 'fulfilled' || queueRes.status === 'fulfilled' || objectInfoRes.status === 'fulfilled';
        if (!isAnySuccess) {
          const err = statsRes.reason || queueRes.reason || objectInfoRes.reason;
          throw err;
        }

        let systemInfo = {};
        if (statsRes.status === 'fulfilled' && statsRes.value.data && typeof statsRes.value.data === 'object') {
          systemInfo = statsRes.value.data;
        }

        let ckptCount = 0;
        let diffCount = 0;
        let loraCount = 0;
        let vaeCount = 0;
        let textEncoderCount = 0;

        if (objectInfoRes.status === 'fulfilled' && objectInfoRes.value.data && typeof objectInfoRes.value.data === 'object') {
          const obj = objectInfoRes.value.data;
          const ckpts = obj.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0]
            || obj.CheckpointLoader?.input?.required?.ckpt_name?.[0]
            || [];
          const diffs = obj.UNETLoader?.input?.required?.unet_name?.[0]
            || obj.DiffusionModelLoader?.input?.required?.model_name?.[0]
            || obj.UNETLoaderSimple?.input?.required?.unet_name?.[0]
            || [];
          const loras = obj.LoraLoader?.input?.required?.lora_name?.[0]
            || obj.LoraLoaderModelOnly?.input?.required?.lora_name?.[0]
            || obj.LoraLoaderModelOnly?.input?.optional?.lora_name?.[0]
            || [];
          const vaes = obj.VAELoader?.input?.required?.vae_name?.[0]
            || obj.VAELoaderSimple?.input?.required?.vae_name?.[0]
            || [];
          const textEncoders = obj.CLIPLoader?.input?.required?.clip_name?.[0]
            || obj.DualCLIPLoader?.input?.required?.clip_name1?.[0]
            || obj.TextEncoderLoader?.input?.required?.clip_name?.[0]
            || [];

          ckptCount = Array.isArray(ckpts) ? ckpts.length : 0;
          diffCount = Array.isArray(diffs) ? diffs.length : 0;
          loraCount = Array.isArray(loras) ? loras.length : 0;
          vaeCount = Array.isArray(vaes) ? vaes.length : 0;
          textEncoderCount = Array.isArray(textEncoders) ? textEncoders.length : 0;
        }

        const modelSummary = [];
        if (ckptCount > 0) modelSummary.push(`${ckptCount} Checkpoints`);
        if (diffCount > 0) modelSummary.push(`${diffCount} Diffusion/UNet`);
        if (loraCount > 0) modelSummary.push(`${loraCount} LoRAs`);
        if (vaeCount > 0) modelSummary.push(`${vaeCount} VAEs`);
        if (textEncoderCount > 0) modelSummary.push(`${textEncoderCount} Text Encoders`);

        const summaryText = modelSummary.length > 0
          ? `检测到 ${modelSummary.join('，')}`
          : 'ComfyUI 服务在线';

        let deviceDesc = '检测到 ComfyUI 服务';
        if (Array.isArray(systemInfo.devices) && systemInfo.devices.length > 0) {
          deviceDesc = systemInfo.devices
            .filter(Boolean)
            .map(d => `${d.name || 'GPU'} (${Math.round((d.vram_free || 0) / 1024 / 1024 / 1024)}GB Free)`)
            .join(', ');
        }

        return {
          success: true,
          latencyMs,
          message: `ComfyUI 实例连接成功！响应耗时 ${latencyMs}ms。${summaryText}。`,
          details: {
            os: systemInfo.system?.os || '未知系统',
            python_version: systemInfo.system?.python_version || '',
            devices: deviceDesc,
            ckptCount,
            diffCount,
            loraCount,
            vaeCount,
            textEncoderCount,
          },
        };
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        let tip = '';
        if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
          tip = '（请检查本地 ComfyUI 是否已启动并在 8188 端口运行，如果是容器环境请确认网络互通或配置正确的 host.docker.internal / IP）';
        } else if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
          tip = '（连接超时，请检查防火墙或网络连接）';
        }
        return {
          success: false,
          latencyMs,
          error: `连接 ComfyUI 失败 (${cleanBaseUrl}): ${err.message} ${tip}`,
        };
      }
    }

    // OpenAI 兼容协议 / Anthropic / Grok 测试
    try {
      const headers = {};
      if (cleanApiKey) {
        headers.Authorization = cleanApiKey.startsWith('Bearer ') ? cleanApiKey : `Bearer ${cleanApiKey}`;
      }
      if (protocol === 'anthropic') {
        headers['x-api-key'] = cleanApiKey;
        headers['anthropic-version'] = '2023-06-01';
      }

      const modelsUrl = cleanBaseUrl.endsWith('/v1')
        ? `${cleanBaseUrl}/models`
        : `${cleanBaseUrl}/v1/models`;

      const res = await axios.get(modelsUrl, {
        headers,
        timeout: 8000,
      });

      const latencyMs = Date.now() - startTime;
      let count = 0;
      if (Array.isArray(res.data)) count = res.data.length;
      else if (Array.isArray(res.data?.data)) count = res.data.data.length;
      else if (Array.isArray(res.data?.models)) count = res.data.models.length;

      return {
        success: true,
        latencyMs,
        message: `接口连接成功！响应耗时 ${latencyMs}ms。可用模型数：${count}`,
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        error: `连接失败 (${cleanBaseUrl}): ${err.response?.data?.error?.message || err.message}`,
      };
    }
  }

  /**
   * 探测并获取 ComfyUI 已安装的所有模型 (Checkpoints, LoRAs, VAEs, Samplers 等)
   */
  async inspectComfyUI(params) {
    const { baseUrl, apiKey } = params;
    if (!baseUrl || !String(baseUrl).trim()) {
      this.ctx.throw(400, '请填写 ComfyUI 实例地址');
    }

    const cleanBaseUrl = String(baseUrl).trim().replace(/\/+$/, '');
    const headers = {};
    if (apiKey && String(apiKey).trim()) {
      const key = String(apiKey).trim();
      headers.Authorization = key.startsWith('Bearer ') ? key : `Bearer ${key}`;
    }

    try {
      // 优先请求 object_info
      let objectInfo = {};
      let modelsEndpoints = {};

      try {
        const objectInfoUrl = `${cleanBaseUrl}/object_info`;
        const res = await axios.get(objectInfoUrl, {
          headers,
          timeout: 15000,
        });
        objectInfo = res.data || {};
      } catch (objErr) {
        this.ctx.logger.warn('[comfyui] object_info 请求异常，尝试备用接口:', objErr.message);
      }

      // 如果有 models API 或 comfy-cli 扩展，也做补充提取
      try {
        const modelsRes = await axios.get(`${cleanBaseUrl}/models/checkpoints`, {
          headers,
          timeout: 5000,
        });
        if (Array.isArray(modelsRes.data)) {
          modelsEndpoints.checkpoints = modelsRes.data;
        }
      } catch (_) {
        // ignore
      }

      // 提取 Checkpoints (models/checkpoints)
      let checkpoints = [];
      const ckptInput = objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0]
        || objectInfo.CheckpointLoader?.input?.required?.ckpt_name?.[0];
      if (Array.isArray(ckptInput)) {
        checkpoints = ckptInput;
      }
      if (checkpoints.length === 0 && Array.isArray(modelsEndpoints.checkpoints)) {
        checkpoints = modelsEndpoints.checkpoints;
      }

      // 提取 Diffusion Models / UNet (models/diffusion_models 或 models/unet)
      let diffusionModels = [];
      const diffInput = objectInfo.UNETLoader?.input?.required?.unet_name?.[0]
        || objectInfo.DiffusionModelLoader?.input?.required?.model_name?.[0]
        || objectInfo.UNETLoaderSimple?.input?.required?.unet_name?.[0];
      if (Array.isArray(diffInput)) {
        diffusionModels = diffInput;
      }

      // 提取 Text Encoders / CLIP (models/text_encoders 或 models/clip)
      let textEncoders = [];
      const clipInput = objectInfo.CLIPLoader?.input?.required?.clip_name?.[0]
        || objectInfo.DualCLIPLoader?.input?.required?.clip_name1?.[0]
        || objectInfo.TextEncoderLoader?.input?.required?.clip_name?.[0];
      if (Array.isArray(clipInput)) {
        textEncoders = clipInput;
      }

      // 提取 LoRAs (models/loras)
      let loras = [];
      const loraInput = objectInfo.LoraLoader?.input?.required?.lora_name?.[0]
        || objectInfo.LoraLoaderModelOnly?.input?.required?.lora_name?.[0]
        || objectInfo.LoraLoaderModelOnly?.input?.optional?.lora_name?.[0];
      if (Array.isArray(loraInput)) {
        loras = loraInput;
      }

      // 提取 VAEs (models/vae)
      let vaes = [];
      const vaeInput = objectInfo.VAELoader?.input?.required?.vae_name?.[0]
        || objectInfo.VAELoaderSimple?.input?.required?.vae_name?.[0];
      if (Array.isArray(vaeInput)) {
        vaes = vaeInput;
      }

      // 提取 Samplers & Schedulers
      let samplers = [];
      let schedulers = [];
      const samplerInput = objectInfo.KSampler?.input?.required?.sampler_name?.[0]
        || objectInfo.KSamplerAdvanced?.input?.required?.sampler_name?.[0];
      if (Array.isArray(samplerInput)) {
        samplers = samplerInput;
      }
      const schedulerInput = objectInfo.KSampler?.input?.required?.scheduler?.[0]
        || objectInfo.KSamplerAdvanced?.input?.required?.scheduler?.[0];
      if (Array.isArray(schedulerInput)) {
        schedulers = schedulerInput;
      }

      // 提取 ControlNets (models/controlnet)
      let controlnets = [];
      const controlNetInput = objectInfo.ControlNetLoader?.input?.required?.control_net_name?.[0];
      if (Array.isArray(controlNetInput)) {
        controlnets = controlNetInput;
      }

      // 聚合所有可用的生图主模型 (Checkpoints + Diffusion Models)
      const allMainModels = [
        ...checkpoints,
        ...diffusionModels,
      ];

      // 智能匹配默认工作流
      const defaultModel = allMainModels[0] || '';
      const matched = autoMatchWorkflow(defaultModel, {
        loras,
        diffusionModels,
        textEncoders,
        vaes,
      });

      return {
        models: allMainModels,
        comfyData: {
          checkpoints,
          diffusionModels,
          textEncoders,
          loras,
          vaes,
          samplers,
          schedulers,
          controlnets,
          templates: Object.values(WORKFLOW_TEMPLATES),
          matchedWorkflow: matched,
        },
        total: allMainModels.length,
      };
    } catch (err) {
      this.ctx.logger.error('[comfyui] 探测模型失败:', err.message);
      let tip = '';
      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        tip = '（请检查本地 ComfyUI 是否已在 8188 端口启动）';
      }
      this.ctx.throw(502, `连接 ComfyUI 失败 (${cleanBaseUrl}): ${err.response?.data?.error || err.message} ${tip}`);
    }
  }

  /**
   * 返回 ComfyUI 工作流预设模板列表
   */
  getComfyUITemplates() {
    return Object.values(WORKFLOW_TEMPLATES);
  }

  /**
   * 让文本大模型根据用户本地模型与漫画需求生成定制 ComfyUI 工作流
   */
  async generateComfyUIWorkflow(params) {
    const {
      textProviderId = null,
      styleRequirement,
      checkpoint,
      lora,
      availableModels = {},
      resolution = '1024x1024',
    } = params;

    const { checkpoints = [], loras = [], samplers = [] } = availableModels;

    const systemPrompt = `你是一位精通 ComfyUI 架构与 AI 漫画绘制的专家。
你的任务是根据用户指定的漫画风格需求以及用户本地已有的模型文件，生成一份可直接提交给 ComfyUI /prompt 接口执行的 API 格式 Workflow JSON。

【ComfyUI API 格式规范】
1. Workflow 必须是一个以节点 ID（如 "1", "2", "3"）为 key 的 JSON 对象。
2. 每个节点必须包含:
   - "class_type": 节点类名（如 "CheckpointLoaderSimple", "CLIPTextEncode", "EmptyLatentImage", "KSampler", "VAEDecode", "SaveImage", "LoraLoader" 等）
   - "inputs": 该节点的参数输入与连线。对于节点连线，格式为 [来源节点ID字符串, 来源输出槽位索引数字]。
3. 必须包含完整的漫画出图管线：
   - Checkpoint 加载节点 (CheckpointLoaderSimple)
   - 正向提示词节点 (CLIPTextEncode): 包含针对用户漫画需求的精美风格词（如日漫、网点线稿、黑白分镜、电影光影等）
   - 负向提示词节点 (CLIPTextEncode): 包含漫画常用的高质量负向词 (lowres, bad anatomy, bad hands, blurry 等)
   - 空潜空间节点 (EmptyLatentImage): 设置宽高等
   - 采样节点 (KSampler): 设置合理 steps (20-30), cfg (6-8), sampler_name, scheduler, denoise: 1
   - VAE 解码节点 (VAEDecode)
   - 保存图片节点 (SaveImage): filename_prefix 为 "Comic_AI"
4. 若指定了 LoRA，需合理插入 LoraLoader 并将 model 和 clip 连接到正负向 CLIP 及采样器。

【必须输出的 JSON 结构】
你必须返回一个严格合法的 JSON 对象，不要附加任何 Markdown 代码块或额外文字：
{
  "workflow": { ...完整的节点字典... },
  "positiveNodeId": "正向提示词节点ID",
  "negativeNodeId": "负向提示词节点ID",
  "checkpointNodeId": "CheckpointLoader节点ID",
  "samplerNodeId": "KSampler节点ID",
  "explanation": "工作流设计思路与特点说明",
  "recommendedParams": {
    "steps": 28,
    "cfg": 7.0,
    "sampler": "dpmpp_2m",
    "scheduler": "karras",
    "resolution": "${resolution}"
  }
}`;

    const userPrompt = `用户漫画风格与剧情需求: ${styleRequirement || '标准二次元精美漫画分镜，清晰线稿与黑白网点'}
指定使用 Checkpoint: ${checkpoint || checkpoints[0] || '默认模型'}
指定使用 LoRA (可选): ${lora || (loras.length > 0 ? loras[0] : '无')}
目标出图分辨率: ${resolution}
本地已安装 Checkpoints 参考: ${checkpoints.slice(0, 10).join(', ')}
本地已安装 LoRAs 参考: ${loras.slice(0, 10).join(', ')}
本地支持的采样器: ${samplers.slice(0, 10).join(', ')}

请为该需求生成最适配的 ComfyUI 工作流。`;

    try {
      const { protocol, config } = await this.ctx.service.aiText.getProtocol(textProviderId);
      const res = await protocol.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        responseFormat: 'json_object',
      });

      const parsed = JSON.parse(res.content.replace(/```json\n?|\n?```/g, '').trim());
      if (!parsed.workflow || typeof parsed.workflow !== 'object') {
        throw new Error('AI 生成的工作流格式不正确');
      }

      // 验证必要节点连接
      const wf = parsed.workflow;
      if (parsed.checkpointNodeId && wf[parsed.checkpointNodeId]?.inputs && checkpoint) {
        wf[parsed.checkpointNodeId].inputs.ckpt_name = checkpoint;
      }

      return parsed;
    } catch (err) {
      this.ctx.logger.error('[comfyui] AI 生成工作流失败:', err);
      // 回退到自动匹配模板
      const fallback = autoMatchWorkflow(checkpoint || checkpoints[0] || '', { loras });
      return {
        workflow: fallback.workflow,
        positiveNodeId: fallback.positiveNodeId,
        negativeNodeId: fallback.negativeNodeId,
        checkpointNodeId: fallback.checkpointNodeId,
        samplerNodeId: fallback.samplerNodeId,
        explanation: '（AI 智能生成降级回退）已根据本地模型特性自动匹配最佳预设漫画工作流。',
        recommendedParams: {
          steps: 28,
          cfg: 7.0,
          sampler: 'dpmpp_2m',
          scheduler: 'karras',
          resolution,
        },
      };
    }
  }
}

module.exports = AiProviderService;
