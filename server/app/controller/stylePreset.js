// server/app/controller/stylePreset.js
const Controller = require('egg').Controller;

class StylePresetController extends Controller {
  async index() {
    const { ctx } = this;
    
    try {
      const presets = await ctx.service.stylePreset.getEnabledPresets();
      const categories = await ctx.service.stylePreset.getCategories();
      
      const groupedData = categories.map(category => {
        const categoryPresets = presets.filter(p => p.category === category);
        return {
          name: category,
          sortOrder: Math.min(...categoryPresets.map(p => p.sort_order)),
          presets: categoryPresets.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            stylePrompt: p.style_prompt,
            description: p.description,
            coverImage: p.cover_image
          }))
        };
      });
      
      ctx.body = {
        categories: groupedData
      };
    } catch (error) {
      ctx.logger.error('[StylePresetController] 获取风格预设列表失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取风格预设列表失败' };
    }
  }
}

module.exports = StylePresetController;
