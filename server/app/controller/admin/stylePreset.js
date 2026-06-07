// server/app/controller/admin/stylePreset.js
const Controller = require('egg').Controller;

class AdminStylePresetController extends Controller {
  async index() {
    const { ctx } = this;
    
    try {
      const presets = await ctx.service.stylePreset.getAllPresets();
      ctx.body = {
        presets: presets.map(p => ({
          id: p.id,
          code: p.code,
          name: p.name,
          category: p.category,
          stylePrompt: p.style_prompt,
          description: p.description,
          coverImage: p.cover_image,
          sortOrder: p.sort_order,
          isEnabled: p.is_enabled === 1,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }))
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
      const { code, name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } = ctx.request.body;
      
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
        isEnabled: isEnabled !== undefined ? isEnabled : true
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
      const id = parseInt(ctx.params.id);
      if (isNaN(id)) {
        ctx.status = 400;
        ctx.body = { error: '无效的 ID 参数' };
        return;
      }
      
      const { name, category, stylePrompt, description, coverImage, sortOrder, isEnabled } = ctx.request.body;
      
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
        coverImage,
        sortOrder,
        isEnabled
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
      const id = parseInt(ctx.params.id);
      if (isNaN(id)) {
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
      const id = parseInt(ctx.params.id);
      if (isNaN(id)) {
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
      
      await ctx.service.stylePreset.destroy(id);
      ctx.body = { message: '删除成功' };
    } catch (error) {
      ctx.logger.error('[AdminStylePresetController] 删除风格预设失败:', error);
      ctx.status = 500;
      ctx.body = { error: '删除风格预设失败' };
    }
  }
}

module.exports = AdminStylePresetController;
