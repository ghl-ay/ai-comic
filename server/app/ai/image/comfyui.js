// server/app/ai/image/comfyui.js
'use strict';

const axios = require('axios');
const BaseImageProtocol = require('./base');
const { autoMatchWorkflow, WORKFLOW_TEMPLATES } = require('./comfyui-templates');
const { referencesToLocalPaths } = require('../utils/reference');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class ComfyUIImageProtocol extends BaseImageProtocol {
  constructor(config) {
    super(config);
    this.baseUrl = (config.baseUrl || 'http://127.0.0.1:8188').replace(/\/+$/, '');
    this.apiKey = config.apiKey ? config.apiKey.trim() : '';
    this.extra = typeof config.extra === 'object' && config.extra ? config.extra : {};
    this.pollIntervalMs = Number(this.extra.pollIntervalMs) || 1500;
    this.maxPollAttempts = Number(this.extra.maxPollAttempts) || 120;
  }

  getHeaders() {
    const headers = {};
    if (this.apiKey) {
      if (this.apiKey.startsWith('Bearer ')) {
        headers.Authorization = this.apiKey;
      } else {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }
    }
    return headers;
  }

  /**
   * 上传参考图到 ComfyUI input 目录
   */
  async uploadImageToComfy(imageBuffer, filename) {
    const form = new FormData();
    form.append('image', imageBuffer, { filename: filename || `ref_${Date.now()}.png` });
    form.append('overwrite', 'true');

    const uploadUrl = `${this.baseUrl}/upload/image`;
    const response = await axios.post(uploadUrl, form, {
      headers: {
        ...this.getHeaders(),
        ...form.getHeaders(),
      },
      timeout: 30000,
    });
    return response.data;
  }

  /**
   * 组装或解析可执行的 ComfyUI Prompt Workflow
   */
  buildWorkflow(request) {
    let workflow = null;
    let positiveNodeId = this.extra.positiveNodeId;
    let negativeNodeId = this.extra.negativeNodeId;
    let checkpointNodeId = this.extra.checkpointNodeId;
    let samplerNodeId = this.extra.samplerNodeId;
    let emptyLatentNodeId = this.extra.emptyLatentNodeId;

    if (this.extra.workflow) {
      try {
        workflow = typeof this.extra.workflow === 'string'
          ? JSON.parse(this.extra.workflow)
          : JSON.parse(JSON.stringify(this.extra.workflow));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[comfyui] 解析自定义工作流失败，使用默认模板:', e.message);
      }
    }

    const currentModel = request.model || this.config.model;

    if (!workflow) {
      const matched = autoMatchWorkflow(currentModel, {
        preferredTemplate: this.extra.templateId,
      });
      workflow = matched.workflow;
      positiveNodeId = positiveNodeId || matched.positiveNodeId;
      negativeNodeId = negativeNodeId || matched.negativeNodeId;
      checkpointNodeId = checkpointNodeId || matched.checkpointNodeId;
      samplerNodeId = samplerNodeId || matched.samplerNodeId;
    }

    // 1. 自动寻找/更新 Checkpoint 模型节点
    if (currentModel) {
      if (checkpointNodeId && workflow[checkpointNodeId]?.inputs) {
        workflow[checkpointNodeId].inputs.ckpt_name = currentModel;
      } else {
        for (const [nodeId, node] of Object.entries(workflow)) {
          if (node.class_type === 'CheckpointLoaderSimple' || node.class_type === 'CheckpointLoader') {
            node.inputs = node.inputs || {};
            node.inputs.ckpt_name = currentModel;
            checkpointNodeId = nodeId;
            break;
          }
        }
      }
    }

    // 2. 自动定位或更新 Positive / Negative 提示词节点
    if (!positiveNodeId) {
      // 遍历查找 CLIPTextEncode 节点
      const textNodes = Object.entries(workflow).filter(
        ([, n]) => n.class_type === 'CLIPTextEncode'
      );
      if (textNodes.length >= 1) {
        positiveNodeId = textNodes[0][0];
      }
      if (textNodes.length >= 2) {
        negativeNodeId = textNodes[1][0];
      }
    }

    if (positiveNodeId && workflow[positiveNodeId]?.inputs) {
      workflow[positiveNodeId].inputs.text = request.prompt || '';
    }

    if (negativeNodeId && workflow[negativeNodeId]?.inputs && this.extra.negativePrompt) {
      workflow[negativeNodeId].inputs.text = this.extra.negativePrompt;
    }

    // 3. 随机化 Seed
    const randomSeed = Math.floor(Math.random() * 1000000000000);
    for (const [, node] of Object.entries(workflow)) {
      if (node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced') {
        if (node.inputs && typeof node.inputs.seed !== 'undefined') {
          node.inputs.seed = randomSeed;
        }
      }
    }

    // 4. 解析并设置分辨率
    if (request.size) {
      const parts = String(request.size).split('x');
      if (parts.length === 2) {
        const w = parseInt(parts[0], 10);
        const h = parseInt(parts[1], 10);
        if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
          for (const [, node] of Object.entries(workflow)) {
            if (node.class_type === 'EmptyLatentImage' && node.inputs) {
              node.inputs.width = w;
              node.inputs.height = h;
            }
          }
        }
      }
    }

    return workflow;
  }

  async generate(request) {
    const workflow = this.buildWorkflow(request);
    const clientId = `aicomic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 检查是否有参考图需要上传
    if (request.references && request.references.length > 0) {
      const localPaths = referencesToLocalPaths(request.references);
      if (localPaths.length > 0) {
        for (const [, node] of Object.entries(workflow)) {
          if (node.class_type === 'LoadImage' && node.inputs) {
            try {
              const fileBuf = fs.readFileSync(localPaths[0]);
              const uploadRes = await this.uploadImageToComfy(
                fileBuf,
                path.basename(localPaths[0])
              );
              node.inputs.image = uploadRes.name;
              break;
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn('[comfyui] 上传参考图到 ComfyUI 失败:', err.message);
            }
          }
        }
      }
    }

    // 发起生图请求
    const promptUrl = `${this.baseUrl}/prompt`;
    let promptId;

    try {
      const response = await axios.post(
        promptUrl,
        {
          client_id: clientId,
          prompt: workflow,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getHeaders(),
          },
          timeout: 20000,
        }
      );

      promptId = response.data?.prompt_id;
      if (!promptId) {
        if (response.data?.node_errors && Object.keys(response.data.node_errors).length > 0) {
          const errDetail = JSON.stringify(response.data.node_errors);
          throw new Error(`ComfyUI 节点错误: ${errDetail}`);
        }
        throw new Error('ComfyUI 未返回 prompt_id');
      }
    } catch (err) {
      if (err.response?.data?.node_errors) {
        const errDetail = JSON.stringify(err.response.data.node_errors);
        throw new Error(`ComfyUI 节点配置错误: ${errDetail}`);
      }
      if (err.response?.data?.error) {
        throw new Error(`ComfyUI 错误: ${JSON.stringify(err.response.data.error)}`);
      }
      throw new Error(`连接 ComfyUI 失败 (${this.baseUrl}): ${err.message}`);
    }

    // 轮询结果
    const historyUrl = `${this.baseUrl}/history/${promptId}`;
    let imageInfo = null;

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));

      try {
        const historyRes = await axios.get(historyUrl, {
          headers: this.getHeaders(),
          timeout: 15000,
        });

        const promptData = historyRes.data?.[promptId];
        if (!promptData) continue;

        // 检查执行状态
        if (promptData.status?.status_str === 'error') {
          const errMsg = promptData.status?.messages?.[0] || 'ComfyUI 内部执行错误';
          throw new Error(`ComfyUI 执行失败: ${JSON.stringify(errMsg)}`);
        }

        // 提取图片输出
        const outputs = promptData.outputs || {};
        for (const output of Object.values(outputs)) {
          if (output.images && output.images.length > 0) {
            imageInfo = output.images[0];
            break;
          }
        }

        if (imageInfo) break;
      } catch (pollErr) {
        if (pollErr.message.includes('ComfyUI 执行失败')) {
          throw pollErr;
        }
        // 临时网络重试
      }
    }

    if (!imageInfo || !imageInfo.filename) {
      throw new Error(`ComfyUI 生图超时 (未在 ${Math.round((this.pollIntervalMs * this.maxPollAttempts) / 1000)} 秒内完成)`);
    }

    // 下载生成好的图片
    const viewUrl = `${this.baseUrl}/view`;
    const imageRes = await axios.get(viewUrl, {
      params: {
        filename: imageInfo.filename,
        subfolder: imageInfo.subfolder || '',
        type: imageInfo.type || 'output',
      },
      headers: this.getHeaders(),
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    return {
      imageBuffer: Buffer.from(imageRes.data),
    };
  }
}

module.exports = ComfyUIImageProtocol;
