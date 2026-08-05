// server/app/controller/stylePreset.js
const Controller = require('egg').Controller;

class StylePresetController extends Controller {
  async index() {
    const { ctx } = this;

    try {
      const presets = await ctx.service.stylePreset.getEnabledPresets();
      const categories = await ctx.service.stylePreset.getCategories();

      const mappedPresets = presets.map(preset =>
        ctx.service.stylePreset.mapPresetRow(preset)
      );

      const groupedData = categories.map(category => {
        const categoryPresets = mappedPresets.filter(preset => preset.category === category);
        return {
          name: category,
          sortOrder: Math.min(...categoryPresets.map(preset => preset.sortOrder)),
          presets: categoryPresets,
        };
      });

      ctx.body = {
        presets: mappedPresets,
        categories: groupedData,
      };
    } catch (error) {
      ctx.logger.error('[StylePresetController] 获取风格预设列表失败:', error);
      ctx.status = 500;
      ctx.body = { error: '获取风格预设列表失败' };
    }
  }
}

module.exports = StylePresetController;
