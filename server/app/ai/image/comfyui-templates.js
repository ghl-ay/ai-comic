// server/app/ai/image/comfyui-templates.js
'use strict';

const WORKFLOW_TEMPLATES = {
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
};

/**
 * 根据模型名称与可用 LoRA 自动匹配并组装工作流
 */
function autoMatchWorkflow(checkpointName, { loras = [], preferredTemplate = null } = {}) {
  let templateKey = preferredTemplate;

  if (!templateKey || !WORKFLOW_TEMPLATES[templateKey]) {
    const lowerName = (checkpointName || '').toLowerCase();
    if (lowerName.includes('flux')) {
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
    workflow[template.checkpointNodeId].inputs.ckpt_name = checkpointName || '';
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
    checkpointNodeId: template.checkpointNodeId,
    samplerNodeId: template.samplerNodeId,
    outputNodeId: template.outputNodeId,
  };
}

module.exports = {
  WORKFLOW_TEMPLATES,
  autoMatchWorkflow,
};
