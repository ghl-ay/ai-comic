'use strict';

const assert = require('assert');
const { CORE_CODES } = require('../../../database/seeds/style_presets');

/**
 * 轻量测 resolveStyleBinding 的决策语义（不启整个 Egg）。
 * 通过手工 mock 最小 service 形状复用真实算法逻辑。
 */
function createBindingHarness(fixtures = {}) {
  const presetsById = new Map(fixtures.presets || []);
  const defaultPreset = fixtures.defaultPreset || null;
  const defaultPrompt = fixtures.defaultPrompt || '默认风格';

  const service = {
    ctx: {
      throw(status, message) {
        const error = new Error(message);
        error.status = status;
        throw error;
      },
    },
    isCoreCode(code) {
      return CORE_CODES.includes(code);
    },
    async getEnabledById(id) {
      const preset = presetsById.get(id);
      if (!preset || preset.is_enabled === 0) return null;
      return preset;
    },
    async getById(id) {
      return presetsById.get(id) || null;
    },
    async getDefaultPreset() {
      return defaultPreset;
    },
    async getDefaultStylePrompt() {
      return defaultPrompt;
    },
  };

  // 从 stylePreset service 源码拷贝 resolveStyleBinding 太脆；
  // 这里 require 真实类原型方法并 bind。
  const StylePresetService = require('../../../app/service/stylePreset');
  service.resolveStyleBinding = StylePresetService.prototype.resolveStyleBinding;

  return service;
}

describe('test/app/service/style-binding.test.js', () => {
  const mono = {
    id: 1,
    code: 'jp_monochrome',
    style_prompt: '日系黑白漫画风格',
    is_enabled: 1,
  };
  const color = {
    id: 2,
    code: 'jp_color',
    style_prompt: '日系全彩漫画风格',
    is_enabled: 1,
  };

  it('create: 未传 presetId 且无 prompt → 默认绑定日漫黑白', async () => {
    const service = createBindingHarness({
      defaultPreset: mono,
      presets: [[1, mono], [2, color]],
    });
    const result = await service.resolveStyleBinding({ mode: 'create' });
    assert.strictEqual(result.stylePresetId, 1);
    assert.strictEqual(result.stylePrompt, mono.style_prompt);
  });

  it('create: 仅有自定义 prompt → 不解绑绑定 id 为 null', async () => {
    const service = createBindingHarness({ defaultPreset: mono });
    const result = await service.resolveStyleBinding({
      mode: 'create',
      stylePrompt: '水彩插画',
    });
    assert.strictEqual(result.stylePresetId, null);
    assert.strictEqual(result.stylePrompt, '水彩插画');
  });

  it('create: 显式 presetId → 绑定并可用预设文案', async () => {
    const service = createBindingHarness({
      presets: [[2, color]],
    });
    const result = await service.resolveStyleBinding({
      mode: 'create',
      stylePresetId: 2,
      stylePresetIdProvided: true,
    });
    assert.strictEqual(result.stylePresetId, 2);
    assert.strictEqual(result.stylePrompt, color.style_prompt);
  });

  it('create: 显式 null → 解绑，无 prompt 用默认文案', async () => {
    const service = createBindingHarness({ defaultPrompt: '默认风格' });
    const result = await service.resolveStyleBinding({
      mode: 'create',
      stylePresetId: null,
      stylePresetIdProvided: true,
    });
    assert.strictEqual(result.stylePresetId, null);
    assert.strictEqual(result.stylePrompt, '默认风格');
  });

  it('update: 仅改 prompt 且与绑定文案不同 → 自动解绑', async () => {
    const service = createBindingHarness({
      presets: [[1, mono]],
    });
    const result = await service.resolveStyleBinding({
      mode: 'update',
      stylePrompt: '完全不同的自定义风格',
      stylePresetIdProvided: false,
      existing: { style_preset_id: 1, style_prompt: mono.style_prompt },
    });
    assert.strictEqual(result.stylePresetId, null);
    assert.strictEqual(result.stylePrompt, '完全不同的自定义风格');
  });

  it('update: 仅改 prompt 且与绑定文案相同 → 保持绑定不动', async () => {
    const service = createBindingHarness({
      presets: [[1, mono]],
    });
    const result = await service.resolveStyleBinding({
      mode: 'update',
      stylePrompt: mono.style_prompt,
      stylePresetIdProvided: false,
      existing: { style_preset_id: 1, style_prompt: mono.style_prompt },
    });
    assert.strictEqual(result.stylePresetId, undefined);
    assert.strictEqual(result.stylePrompt, mono.style_prompt);
  });

  it('update: 显式绑定新 preset → 写入 id 与文案', async () => {
    const service = createBindingHarness({
      presets: [[2, color]],
    });
    const result = await service.resolveStyleBinding({
      mode: 'update',
      stylePresetId: 2,
      stylePresetIdProvided: true,
      existing: { style_preset_id: 1, style_prompt: mono.style_prompt },
    });
    assert.strictEqual(result.stylePresetId, 2);
    assert.strictEqual(result.stylePrompt, color.style_prompt);
  });

  it('CORE_CODES 与 isCore 一致', () => {
    assert(CORE_CODES.includes('jp_monochrome'));
    assert.strictEqual(CORE_CODES.length, 8);
  });
});
