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
   * 获取并解析 ComfyUI 已安装的节点与模型资源信息
   */
  async getObjectInfo() {
    try {
      const response = await axios.get(`${this.baseUrl}/object_info`, {
        headers: this.getHeaders(),
        timeout: 6000,
      });
      return response.data || {};
    } catch (err) {
      return {};
    }
  }

  /**
   * 组装或解析可执行的 ComfyUI Prompt Workflow
   */
  async buildWorkflow(request) {
    let workflow = null;
    let positiveNodeId = this.extra.positiveNodeId;
    let negativeNodeId = this.extra.negativeNodeId;
    let checkpointNodeId = this.extra.checkpointNodeId;
    let samplerNodeId = this.extra.samplerNodeId;

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

    // 动态探测 ComfyUI 现有资产
    const objectInfo = await this.getObjectInfo();
    const availableCkpts = objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0]
      || objectInfo.CheckpointLoader?.input?.required?.ckpt_name?.[0]
      || [];
    const availableUnets = objectInfo.UNETLoader?.input?.required?.unet_name?.[0]
      || objectInfo.DiffusionModelLoader?.input?.required?.model_name?.[0]
      || objectInfo.UNETLoaderSimple?.input?.required?.unet_name?.[0]
      || [];
    const availableClips = objectInfo.CLIPLoader?.input?.required?.clip_name?.[0]
      || objectInfo.DualCLIPLoader?.input?.required?.clip_name1?.[0]
      || objectInfo.TextEncoderLoader?.input?.required?.clip_name?.[0]
      || [];
    const availableVaes = objectInfo.VAELoader?.input?.required?.vae_name?.[0]
      || objectInfo.VAELoaderSimple?.input?.required?.vae_name?.[0]
      || [];
    const supportedClipTypes = objectInfo.CLIPLoader?.input?.required?.type?.[0] || [];

    const isDiffusionModel = (currentModel && availableUnets.some(u => u === currentModel || u.includes(currentModel) || currentModel.includes(u)))
      || (availableCkpts.length === 0 && availableUnets.length > 0)
      || /krea|minimax|qwen|diffusion|unet|flux/i.test(currentModel || '')
      || this.extra.templateId === 'split_unet_comic';

    if (!workflow) {
      const matched = autoMatchWorkflow(currentModel, {
        preferredTemplate: isDiffusionModel ? 'split_unet_comic' : this.extra.templateId,
        diffusionModels: availableUnets,
        textEncoders: availableClips,
        vaes: availableVaes,
      });
      workflow = matched.workflow;
      positiveNodeId = positiveNodeId || matched.positiveNodeId;
      negativeNodeId = negativeNodeId || matched.negativeNodeId;
      checkpointNodeId = checkpointNodeId || matched.checkpointNodeId;
      samplerNodeId = samplerNodeId || matched.samplerNodeId;
    }

    // 辅助函数：模糊或精确匹配模型名称
    const matchName = (target, list) => {
      if (!target || !Array.isArray(list) || list.length === 0) return target || (list && list[0]) || '';
      const exact = list.find(item => item === target);
      if (exact) return exact;
      const targetBase = target.replace(/\.(safetensors|ckpt|pt|bin)$/i, '').toLowerCase();
      const found = list.find(item => item.replace(/\.(safetensors|ckpt|pt|bin)$/i, '').toLowerCase() === targetBase);
      if (found) return found;
      const partial = list.find(item => item.toLowerCase().includes(targetBase) || targetBase.includes(item.toLowerCase()));
      if (partial) return partial;
      return list[0] || target;
    };

    // 辅助函数：智能推断 CLIPLoader 的 type 参数 (如 krea2, flux, sd3 等)
    const determineClipType = (model, clip) => {
      const modelLower = (model || '').toLowerCase();
      const clipLower = (clip || '').toLowerCase();

      if (modelLower.includes('krea') || clipLower.includes('krea')) {
        if (supportedClipTypes.includes('krea2')) return 'krea2';
        if (supportedClipTypes.includes('krea')) return 'krea';
        return 'krea2';
      }
      if (clipLower.includes('qwen') && (modelLower.includes('krea') || supportedClipTypes.includes('krea2') || !supportedClipTypes.length)) {
        return 'krea2';
      }
      if (modelLower.includes('flux') || clipLower.includes('flux') || clipLower.includes('t5')) {
        if (supportedClipTypes.includes('flux')) return 'flux';
        return 'flux';
      }
      if (modelLower.includes('sd3') || clipLower.includes('sd3')) {
        if (supportedClipTypes.includes('sd3')) return 'sd3';
        return 'sd3';
      }
      if (modelLower.includes('sdxl') || clipLower.includes('sdxl')) {
        if (supportedClipTypes.includes('sdxl')) return 'sdxl';
      }
      if (modelLower.includes('minimax') || clipLower.includes('minimax')) {
        if (supportedClipTypes.includes('minimax')) return 'minimax';
      }
      if (supportedClipTypes.includes('stable_diffusion')) {
        return 'stable_diffusion';
      }
      return supportedClipTypes[0] || 'stable_diffusion';
    };

    // 如果检测到是分立式扩散模型，但工作流中还包含 CheckpointLoaderSimple（例如 SDXL 模板未更换），做无缝动态架构转换
    if (isDiffusionModel) {
      // 检查工作流是否有 CheckpointLoader 节点
      let cpNodeId = null;
      for (const [nodeId, node] of Object.entries(workflow)) {
        if (node.class_type === 'CheckpointLoaderSimple' || node.class_type === 'CheckpointLoader') {
          cpNodeId = nodeId;
          break;
        }
      }

      const selectedUnet = matchName(currentModel, availableUnets);
      // 智能选取最匹配的 Text Encoder / CLIP
      let selectedClip = availableClips[0] || '';
      if (/minimax/i.test(currentModel || '')) {
        selectedClip = availableClips.find(c => /minimax|32b/i.test(c)) || availableClips.find(c => !/audio/i.test(c)) || availableClips[0] || '';
      } else {
        selectedClip = availableClips.find(c => /qwen|4b/i.test(c)) || availableClips.find(c => !/audio/i.test(c)) || availableClips[0] || '';
      }

      // 智能选取最匹配的 VAE
      let selectedVae = availableVaes[0] || '';
      if (/minimax/i.test(currentModel || '')) {
        selectedVae = availableVaes.find(v => /minimax/i.test(v) && !/audio/i.test(v)) || availableVaes.find(v => !/audio/i.test(v)) || availableVaes[0] || '';
      } else {
        selectedVae = availableVaes.find(v => /image|qwen/i.test(v)) || availableVaes.find(v => !/audio/i.test(v)) || availableVaes[0] || '';
      }

      const targetClipType = determineClipType(currentModel, selectedClip);

      if (cpNodeId) {
        // 动态重组：将 CheckpointLoaderSimple 替换为 UNETLoader，并新建 CLIPLoader 和 VAELoader 节点
        const clipNodeId = `${cpNodeId}_clip_loader`;
        const vaeNodeId = `${cpNodeId}_vae_loader`;

        workflow[cpNodeId] = {
          class_type: 'UNETLoader',
          inputs: {
            unet_name: selectedUnet,
            weight_dtype: 'default',
          },
        };

        workflow[clipNodeId] = {
          class_type: 'CLIPLoader',
          inputs: {
            clip_name: selectedClip,
            type: targetClipType,
          },
        };

        workflow[vaeNodeId] = {
          class_type: 'VAELoader',
          inputs: {
            vae_name: selectedVae,
          },
        };

        // 重新布线：将原本连到 [cpNodeId, 1] (CLIP) 的节点转连到 [clipNodeId, 0]
        // 将原本连到 [cpNodeId, 2] (VAE) 的节点转连到 [vaeNodeId, 0]
        for (const [, node] of Object.entries(workflow)) {
          if (!node.inputs) continue;
          for (const [inputKey, val] of Object.entries(node.inputs)) {
            if (Array.isArray(val) && val.length === 2 && String(val[0]) === String(cpNodeId)) {
              if (val[1] === 1) {
                node.inputs[inputKey] = [clipNodeId, 0];
              } else if (val[1] === 2) {
                node.inputs[inputKey] = [vaeNodeId, 0];
              }
            }
          }
        }
      } else {
        // 工作流已有 UNETLoader 节点
        for (const [, node] of Object.entries(workflow)) {
          if (node.class_type === 'UNETLoader' || node.class_type === 'DiffusionModelLoader') {
            node.inputs = node.inputs || {};
            node.inputs.unet_name = selectedUnet;
          } else if (node.class_type === 'CLIPLoader') {
            node.inputs = node.inputs || {};
            if (selectedClip) node.inputs.clip_name = selectedClip;
            node.inputs.type = targetClipType;
          } else if (node.class_type === 'VAELoader' && selectedVae) {
            node.inputs = node.inputs || {};
            node.inputs.vae_name = selectedVae;
          }
        }
      }
    } else {
      // 传统 Checkpoint 工作流更新
      const selectedCkpt = matchName(currentModel, availableCkpts);
      if (checkpointNodeId && workflow[checkpointNodeId]?.inputs) {
        if (typeof workflow[checkpointNodeId].inputs.ckpt_name !== 'undefined') {
          workflow[checkpointNodeId].inputs.ckpt_name = selectedCkpt;
        } else if (typeof workflow[checkpointNodeId].inputs.unet_name !== 'undefined') {
          workflow[checkpointNodeId].inputs.unet_name = selectedCkpt;
        }
      } else {
        for (const [nodeId, node] of Object.entries(workflow)) {
          if (node.class_type === 'CheckpointLoaderSimple' || node.class_type === 'CheckpointLoader') {
            node.inputs = node.inputs || {};
            node.inputs.ckpt_name = selectedCkpt;
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

    // 5. 全局节点自适应校准与兼容性兜底（针对 Krea2、Flux、SD3 等现代多模态扩散模型）
    const workflowStr = JSON.stringify(workflow).toLowerCase();
    const isKrea = workflowStr.includes('krea') || (currentModel && currentModel.toLowerCase().includes('krea')) || workflowStr.includes('qwen3vl') || workflowStr.includes('qwen');
    const isFlux = !isKrea && (workflowStr.includes('flux') || (currentModel && currentModel.toLowerCase().includes('flux')));
    const isSd3 = !isKrea && !isFlux && (workflowStr.includes('sd3') || (currentModel && currentModel.toLowerCase().includes('sd3')));

    for (const [, node] of Object.entries(workflow)) {
      if (!node || typeof node !== 'object') continue;

      if (node.class_type === 'CLIPLoader') {
        node.inputs = node.inputs || {};
        if (isKrea) {
          node.inputs.type = 'krea2';
        } else if (isFlux) {
          node.inputs.type = 'flux';
        } else if (isSd3) {
          node.inputs.type = 'sd3';
        }
      }
    }

    return workflow;
  }

  async generate(request) {
    const workflow = await this.buildWorkflow(request);
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
