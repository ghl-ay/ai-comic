// server/app/controller/chapter.js
const Controller = require('egg').Controller;

class ChapterController extends Controller {
  async create() {
    const { ctx } = this;
    const { id: comicId } = ctx.params;
    const { title, layoutType } = ctx.request.body;

    try {
      const chapter = await ctx.service.chapter.createChapter(
        parseInt(comicId),
        ctx.state.user.id,
        title,
        layoutType
      );
      ctx.status = 201;
      ctx.body = { chapter };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const chapter = await ctx.service.chapter.getChapterWithComic(
      parseInt(id),
      ctx.state.user.id
    );
    ctx.body = { chapter };
  }

  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { title, layoutType, scriptContent } = ctx.request.body;

    try {
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (layoutType !== undefined) updateData.layout_type = layoutType;
      if (scriptContent !== undefined) updateData.script_content = scriptContent;

      const chapter = await ctx.service.chapter.updateChapter(
        parseInt(id),
        ctx.state.user.id,
        updateData
      );
      ctx.body = { chapter };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      await ctx.service.chapter.deleteChapter(parseInt(id), ctx.state.user.id);
      ctx.body = { message: '删除成功' };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateScript() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { prompt, characterIds } = ctx.request.body;

    if (!prompt || !prompt.trim()) {
      ctx.status = 400;
      ctx.body = { error: '请输入章节提示词' };
      return;
    }

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '请选择至少一个出场角色' };
      return;
    }

    try {
      const script = await ctx.service.chapter.generateScript(
        parseInt(id),
        ctx.state.user.id,
        prompt,
        characterIds
      );
      ctx.body = { script };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateImage() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const result = await ctx.service.chapter.generateImage(
        parseInt(id),
        ctx.state.user.id
      );
      ctx.body = { imagePath: result.imagePath };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateChapterPrompt() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { characterIds } = ctx.request.body;

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '请选择至少一个出场角色' };
      return;
    }

    try {
      const result = await ctx.service.chapter.generateChapterPrompt(
        parseInt(id),
        ctx.state.user.id,
        characterIds
      );
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = ChapterController;
