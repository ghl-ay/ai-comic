// server/app/ai/image/comfyui-templates.js
'use strict';

const WORKFLOW_TEMPLATES = {
  krea2_turbo_comic: {
    id: 'krea2_turbo_comic',
    name: 'Krea2 + Qwen3-VL 极速漫画工作流 (Turbo 4步)',
    description: '专为 Krea2 架构设计，使用 Qwen3-VL 文本编码器与 Turbo 4步 LoRA 极速出图。',
    supportedCategories: ['krea2', 'krea', 'turbo'],
    workflow: {
      "1": {
        "class_type": "UNETLoader",
        "inputs": {
          "unet_name": "krea2_turbo_fp8_scaled.safetensors",
          "weight_dtype": "default"
        }
      },
      "2": {
        "class_type": "CLIPLoader",
        "inputs": {
          "clip_name": "qwen3vl_4b_fp8_scaled.safetensors",
          "type": "krea2"
        }
      },
      "3": {
        "class_type": "VAELoader",
        "inputs": {
          "vae_name": "qwen_image_vae.safetensors"
        }
      },
      "4": {
        "class_type": "LoraLoaderModelOnly",
        "inputs": {
          "lora_name": "minimax_h3_fl2v_lightx2v_turbo_4step_v0.1_comfy_resized_avg_rank_21_bf16.safetensors",
          "model": ["1", 0],
          "strength_model": 1.0
        }
      },
      "5": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["2", 0],
          "text": "masterpiece, best quality, expressive anime comic illustration, black and white manga panel, clean lineart"
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["2", 0],
          "text": "lowres, bad anatomy, deformed, bad hands, blurry"
        }
      },
      "7": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 1024,
          "width": 1024
        }
      },
      "8": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 1.0,
          "denoise": 1.0,
          "latent_image": ["7", 0],
          "model": ["4", 0],
          "negative": ["6", 0],
          "positive": ["5", 0],
          "sampler_name": "euler",
          "scheduler": "simple",
          "seed": 0,
          "steps": 4
        }
      },
      "9": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["8", 0],
          "vae": ["3", 0]
        }
      },
      "10": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Comic_Krea2",
          "images": ["9", 0]
        }
      }
    },
    positiveNodeId: '5',
    negativeNodeId: '6',
    unetNodeId: '1',
    clipNodeId: '2',
    vaeNodeId: '3',
    loraNodeId: '4',
    samplerNodeId: '8',
    emptyLatentNodeId: '7',
    outputNodeId: '10',
  },

  krea2_standard_comic: {
    id: 'krea2_standard_comic',
    name: 'Krea2 + Qwen3-VL 标准漫画工作流 (纯净分立式)',
    description: '标准分立式 Krea2 模型 + Qwen3-VL 文本编码器 + Qwen VAE，20步 Euler 采样。',
    supportedCategories: ['krea2', 'krea', 'qwen'],
    workflow: {
      "1": {
        "class_type": "UNETLoader",
        "inputs": {
          "unet_name": "krea2_turbo_fp8_scaled.safetensors",
          "weight_dtype": "default"
        }
      },
      "2": {
        "class_type": "CLIPLoader",
        "inputs": {
          "clip_name": "qwen3vl_4b_fp8_scaled.safetensors",
          "type": "krea2"
        }
      },
      "3": {
        "class_type": "VAELoader",
        "inputs": {
          "vae_name": "qwen_image_vae.safetensors"
        }
      },
      "4": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["2", 0],
          "text": "masterpiece, best quality, expressive anime manga page, clean lineart, screen tone"
        }
      },
      "5": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["2", 0],
          "text": "lowres, bad anatomy, deformed, worst quality, blurry"
        }
      },
      "6": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 1024,
          "width": 1024
        }
      },
      "7": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 5.0,
          "denoise": 1.0,
          "latent_image": ["6", 0],
          "model": ["1", 0],
          "negative": ["5", 0],
          "positive": ["4", 0],
          "sampler_name": "euler",
          "scheduler": "simple",
          "seed": 0,
          "steps": 20
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["7", 0],
          "vae": ["3", 0]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Comic_Krea2",
          "images": ["8", 0]
        }
      }
    },
    positiveNodeId: '4',
    negativeNodeId: '5',
    unetNodeId: '1',
    clipNodeId: '2',
    vaeNodeId: '3',
    samplerNodeId: '7',
    emptyLatentNodeId: '6',
    outputNodeId: '9',
  },

  sdxl_comic: {
    id: 'sdxl_comic',
    name: 'SDXL / 动漫大模型 漫画工作流 (推荐)',
    description: '适用于 Animagine XL、Pony Diffusion、Illustrious XL 等 SDXL 模型，默认 1024x1024 分辨率与 DPM++ 2M Karras 采样。',
    supportedCategories: ['sdxl', 'pony', 'illustrious', 'animagine', 'xl'],
    workflow: {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 7,
          "denoise": 1,
          "latent_image": ["5", 0],
          "model": ["4", 0],
          "negative": ["7", 0],
          "positive": ["6", 0],
          "sampler_name": "dpmpp_2m",
          "scheduler": "karras",
          "seed": 0,
          "steps": 28
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": ""
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 1024,
          "width": 1024
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "masterpiece, best quality, comic panel, dynamic composition, detailed artwork"
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name"
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Comic_SDXL",
          "images": ["8", 0]
        }
      }
    },
    positiveNodeId: '6',
    negativeNodeId: '7',
    checkpointNodeId: '4',
    samplerNodeId: '3',
    emptyLatentNodeId: '5',
    outputNodeId: '9',
  },

  sd15_comic: {
    id: 'sd15_comic',
    name: 'SD 1.5 二次元/漫画标准工作流',
    description: '适用于 Anything、MeinaMix、Counterfeit 等经典 SD 1.5 二次元模型，默认 512x768 竖屏比例与 Euler a 采样。',
    supportedCategories: ['1.5', 'sd15', 'v15', 'anything', 'meina', 'counterfeit', 'abyss'],
    workflow: {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 7,
          "denoise": 1,
          "latent_image": ["5", 0],
          "model": ["4", 0],
          "negative": ["7", 0],
          "positive": ["6", 0],
          "sampler_name": "euler_ancestral",
          "scheduler": "karras",
          "seed": 0,
          "steps": 25
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": ""
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 768,
          "width": 512
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "masterpiece, best quality, comic illustration, anime style, highly detailed"
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, blurry"
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Comic_SD15",
          "images": ["8", 0]
        }
      }
    },
    positiveNodeId: '6',
    negativeNodeId: '7',
    checkpointNodeId: '4',
    samplerNodeId: '3',
    emptyLatentNodeId: '5',
    outputNodeId: '9',
  },

  sdxl_lora_comic: {
    id: 'sdxl_lora_comic',
    name: 'SDXL + LoRA 漫画风格强化工作流',
    description: '支持加载漫画风格或角色 LoRA，增强特定线条、网点或角色一致性。',
    supportedCategories: ['lora', 'style'],
    workflow: {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 7,
          "denoise": 1,
          "latent_image": ["5", 0],
          "model": ["10", 0],
          "negative": ["7", 0],
          "positive": ["6", 0],
          "sampler_name": "dpmpp_2m",
          "scheduler": "karras",
          "seed": 0,
          "steps": 28
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": ""
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 1024,
          "width": 1024
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["10", 1],
          "text": "masterpiece, best quality, manga comic page, monochrome screentone style, ink lines"
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["10", 1],
          "text": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, blurry"
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Comic_LoRA",
          "images": ["8", 0]
        }
      },
      "10": {
        "class_type": "LoraLoader",
        "inputs": {
          "clip": ["4", 1],
          "lora_name": "",
          "model": ["4", 0],
          "strength_clip": 0.8,
          "strength_model": 0.8
        }
      }
    },
    positiveNodeId: '6',
    negativeNodeId: '7',
    checkpointNodeId: '4',
    loraNodeId: '10',
    samplerNodeId: '3',
    emptyLatentNodeId: '5',
    outputNodeId: '9',
  },

  flux_comic: {
    id: 'flux_comic',
    name: 'Flux.1 极速出图工作流',
    description: '适用于 Flux.1 Schnell / Dev 整合检查点模型，高细节表现力。',
    supportedCategories: ['flux', 'schnell', 'dev'],
    workflow: {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 1,
          "denoise": 1,
          "latent_image": ["5", 0],
          "model": ["4", 0],
          "negative": ["7", 0],
          "positive": ["6", 0],
          "sampler_name": "euler",
          "scheduler": "simple",
          "seed": 0,
          "steps": 20
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": ""
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 1024,
          "width": 1024
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "masterpiece, ultra-detailed comic book page illustration, clean ink linework, professional dynamic lighting"
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "bad anatomy, ugly, deformed, blurry, bad hands"
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Comic_Flux",
          "images": ["8", 0]
        }
      }
    },
    positiveNodeId: '6',
    negativeNodeId: '7',
    checkpointNodeId: '4',
    samplerNodeId: '3',
    emptyLatentNodeId: '5',
    outputNodeId: '9',
  },

  split_unet_comic: {
    id: 'split_unet_comic',
    name: '分立式模型 (UNet + TextEncoder + VAE) 漫画工作流',
    description: '适用于 Krea、MiniMax、Qwen、Flux 等分立模型（Diffusion Models + Text Encoders + VAE）。',
    supportedCategories: ['krea', 'minimax', 'qwen', 'diffusion', 'unet'],
    workflow: {
      "1": {
        "class_type": "UNETLoader",
        "inputs": {
          "unet_name": "",
          "weight_dtype": "default"
        }
      },
      "2": {
        "class_type": "CLIPLoader",
        "inputs": {
          "clip_name": "",
          "type": "krea2"
        }
      },
      "3": {
        "class_type": "VAELoader",
        "inputs": {
          "vae_name": ""
        }
      },
      "4": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["2", 0],
          "text": "masterpiece, best quality, expressive anime manga page, clean lineart, screen tone"
        }
      },
      "5": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["2", 0],
          "text": "lowres, bad anatomy, deformed, worst quality, blurry"
        }
      },
      "6": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 1024,
          "width": 1024
        }
      },
      "7": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 6.5,
          "denoise": 1,
          "latent_image": ["6", 0],
          "model": ["1", 0],
          "negative": ["5", 0],
          "positive": ["4", 0],
          "sampler_name": "euler",
          "scheduler": "normal",
          "seed": 0,
          "steps": 20
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["7", 0],
          "vae": ["3", 0]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Comic_Diffusion",
          "images": ["8", 0]
        }
      }
    },
    positiveNodeId: '4',
    negativeNodeId: '5',
    unetNodeId: '1',
    clipNodeId: '2',
    vaeNodeId: '3',
    samplerNodeId: '7',
    emptyLatentNodeId: '6',
    outputNodeId: '9',
  },
};

/**
 * 根据模型名称与可用 LoRA / 节点资源自动匹配并组装工作流
 */
function autoMatchWorkflow(modelName, { loras = [], diffusionModels = [], textEncoders = [], vaes = [], preferredTemplate = null } = {}) {
  let templateKey = preferredTemplate;
  const lowerName = (modelName || '').toLowerCase();

  const isDiffusionModel = diffusionModels.includes(modelName) ||
    lowerName.includes('krea') ||
    lowerName.includes('minimax') ||
    lowerName.includes('qwen') ||
    lowerName.includes('diffusion');

  if (!templateKey || !WORKFLOW_TEMPLATES[templateKey]) {
    if (lowerName.includes('krea') || lowerName.includes('qwen3vl') || lowerName.includes('qwen')) {
      templateKey = loras && loras.length > 0 ? 'krea2_turbo_comic' : 'krea2_standard_comic';
    } else if (isDiffusionModel) {
      templateKey = 'split_unet_comic';
    } else if (lowerName.includes('flux')) {
      templateKey = 'flux_comic';
    } else if (
      lowerName.includes('1.5') ||
      lowerName.includes('sd15') ||
      lowerName.includes('v15') ||
      lowerName.includes('anything') ||
      lowerName.includes('meina') ||
      lowerName.includes('counterfeit') ||
      lowerName.includes('abyss')
    ) {
      templateKey = 'sd15_comic';
    } else if (loras && loras.length > 0 && (lowerName.includes('lora') || lowerName.includes('manga'))) {
      templateKey = 'sdxl_lora_comic';
    } else {
      templateKey = 'sdxl_comic';
    }
  }

  const template = WORKFLOW_TEMPLATES[templateKey] || WORKFLOW_TEMPLATES.sdxl_comic;
  // Deep clone workflow
  const workflow = JSON.parse(JSON.stringify(template.workflow));

  // 填入 Checkpoint 名称
  if (template.checkpointNodeId && workflow[template.checkpointNodeId]?.inputs) {
    workflow[template.checkpointNodeId].inputs.ckpt_name = modelName || '';
  }

  // 填入 UNet / Diffusion Model 名称
  if (template.unetNodeId && workflow[template.unetNodeId]?.inputs) {
    workflow[template.unetNodeId].inputs.unet_name = modelName || diffusionModels[0] || '';
  }

  // 填入 CLIP / Text Encoder
  if (template.clipNodeId && workflow[template.clipNodeId]?.inputs) {
    if (textEncoders.length > 0) {
      workflow[template.clipNodeId].inputs.clip_name = textEncoders[0];
    }
    const encoderName = (workflow[template.clipNodeId].inputs.clip_name || '').toLowerCase();
    if (lowerName.includes('krea') || encoderName.includes('qwen') || encoderName.includes('krea')) {
      workflow[template.clipNodeId].inputs.type = 'krea2';
    } else if (lowerName.includes('flux') || encoderName.includes('flux') || encoderName.includes('t5')) {
      workflow[template.clipNodeId].inputs.type = 'flux';
    } else if (lowerName.includes('sd3')) {
      workflow[template.clipNodeId].inputs.type = 'sd3';
    }
  }

  // 填入 VAE
  if (template.vaeNodeId && workflow[template.vaeNodeId]?.inputs && vaes.length > 0) {
    workflow[template.vaeNodeId].inputs.vae_name = vaes[0];
  }

  // 若存在 LoRA 节点且有可用 LoRA
  if (template.loraNodeId && workflow[template.loraNodeId]?.inputs && loras.length > 0) {
    workflow[template.loraNodeId].inputs.lora_name = loras[0];
  }

  return {
    templateId: template.id,
    templateName: template.name,
    description: template.description,
    workflow,
    positiveNodeId: template.positiveNodeId,
    negativeNodeId: template.negativeNodeId,
    checkpointNodeId: template.checkpointNodeId || template.unetNodeId,
    samplerNodeId: template.samplerNodeId,
    outputNodeId: template.outputNodeId,
  };
}

module.exports = {
  WORKFLOW_TEMPLATES,
  autoMatchWorkflow,
};
