// server/app/controller/admin/stylePreset.js
const Controller = require('egg').Controller;

class AdminStylePresetController extends Controller {
  async index() {
    const { ctx } = this;

    try {
      const presets = await ctx.service.stylePreset.getAllPresets();
      ctx.body = {
        presets: presets.map(preset =>
          ctx.service.stylePreset.mapPresetRow(preset, { includeAdminFields: true })
        ),
      };
    } catch (error) {
      ctx.logger.error('[AdminStylePresetController] 获取风格预设列表失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取风格预设列表失败' };
    }
  }

  async create() {
    const { ctx } = this;

    try {
      const { code, name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } =
        ctx.request.body;

      if (!code || !name || !category || !stylePrompt) {
        ctx.status = 400;
        ctx.body = { error: '缺少必填字段' };
        return;
      }

      const existing = await ctx.service.stylePreset.getByCode(code);
      if (existing) {
        ctx.status = 400;
        ctx.body = { error: '编码已存在' };
        return;
      }

      const id = await ctx.service.stylePreset.create({
        code,
        name,
        category,
        stylePrompt,
        description,
        coverImage,
        sortOrder: sortOrder || 0,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      });

      ctx.status = 201;
      ctx.body = { id, message: '创建成功' };
    } catch (error) {
      ctx.logger.error('[AdminStylePresetController] 创建风格预设失败:', error);
      ctx.status = 500;
      ctx.body = { error: '创建风格预设失败' };
    }
  }

  async update() {
    const { ctx } = this;

    try {
      const id = parseInt(ctx.params.id, 10);
      if (Number.isNaN(id)) {
        ctx.status = 400;
        ctx.body = { error: '无效的 ID 参数' };
        return;
      }

      const { name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } =
        ctx.request.body;

      if (!name || !category || !stylePrompt) {
        ctx.status = 400;
        ctx.body = { error: '缺少必填字段（name、category、stylePrompt）' };
        return;
      }

      const existing = await ctx.service.stylePreset.getById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: '预设不存在' };
        return;
      }

      await ctx.service.stylePreset.update(id, {
        name,
        category,
        stylePrompt,
        description,
        coverImage: coverImage !== undefined ? coverImage : existing.cover_image,
        sortOrder,
        isEnabled,
      });

      ctx.body = { message: '更新成功' };
    } catch (error) {
      ctx.logger.error('[AdminStylePresetController] 更新风格预设失败:', error);
      ctx.status = 500;
      ctx.body = { error: '更新风格预设失败' };
    }
  }

  async toggle() {
    const { ctx } = this;

    try {
      const id = parseInt(ctx.params.id, 10);
      if (Number.isNaN(id)) {
        ctx.status = 400;
        ctx.body = { error: '无效的 ID 参数' };
        return;
      }

      const existing = await ctx.service.stylePreset.getById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: '预设不存在' };
        return;
      }

      await ctx.service.stylePreset.toggle(id);
      ctx.body = { message: '切换成功' };
    } catch (error) {
      ctx.logger.error('[AdminStylePresetController] 切换风格预设状态失败:', error);
      ctx.status = 500;
      ctx.body = { error: '切换风格预设状态失败' };
    }
  }

  async destroy() {
    const { ctx } = this;

    try {
      const id = parseInt(ctx.params.id, 10);
      if (Number.isNaN(id)) {
        ctx.status = 400;
        ctx.body = { error: '无效的 ID 参数' };
        return;
      }

      await ctx.service.stylePreset.destroy(id);
      ctx.body = { message: '删除成功' };
    } catch (error) {
      ctx.status = error.status || 500;
      ctx.body = { error: error.message || '删除风格预设失败' };
    }
  }

  async regenerateCover() {
    const { ctx } = this;

    try {
      const id = parseInt(ctx.params.id, 10);
      if (Number.isNaN(id)) {
        ctx.status = 400;
        ctx.body = { error: '无效的 ID 参数' };
        return;
      }

      const existing = await ctx.service.stylePreset.getById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: '预设不存在' };
        return;
      }

      const { providerId } = ctx.request.body || {};
      const result = await ctx.service.aiImage.generateStyleCover({
        code: existing.code,
        stylePrompt: existing.style_prompt,
        providerId: providerId || null,
      });

      await ctx.service.stylePreset.updateCover(id, result.imagePath);

      ctx.body = {
        id,
        code: existing.code,
        coverImage: result.imagePath,
      };
    } catch (error) {
      ctx.logger.error('[AdminStylePresetController] 重生示例图失败:', error);
      ctx.status = error.status || 500;
      ctx.body = { error: error.message || '重生示例图失败' };
    }
  }

  async regenerateCovers() {
    const { ctx } = this;

    try {
      const { providerId } = ctx.request.body || {};
      const presets = await ctx.service.stylePreset.getAllPresets();
      const results = [];

      for (const preset of presets) {
        try {
          const result = await ctx.service.aiImage.generateStyleCover({
            code: preset.code,
            stylePrompt: preset.style_prompt,
            providerId: providerId || null,
          });
          await ctx.service.stylePreset.updateCover(preset.id, result.imagePath);
          results.push({
            code: preset.code,
            ok: true,
            coverImage: result.imagePath,
          });
        } catch (error) {
          ctx.logger.error(`[AdminStylePresetController] 生成 ${preset.code} 失败:`, error);
          results.push({
            code: preset.code,
            ok: false,
            error: error.message,
          });
        }
      }

      ctx.body = { results };
    } catch (error) {
      ctx.logger.error('[AdminStylePresetController] 批量重生示例图失败:', error);
      ctx.status = error.status || 500;
      ctx.body = { error: error.message || '批量重生示例图失败' };
    }
  }
}

module.exports = AdminStylePresetController;
