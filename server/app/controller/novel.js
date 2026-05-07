// server/app/controller/novel.js
const Controller = require('egg').Controller;

class NovelController extends Controller {
  async create() {
    const { ctx } = this;
    const { title, content } = ctx.request.body;

    if (!content || !content.trim()) {
      ctx.status = 400;
      ctx.body = { error: '请输入小说内容' };
      return;
    }

    if (content.length > 5000) {
      ctx.status = 400;
      ctx.body = { error: '小说内容不能超过 5000 字' };
      return;
    }

    try {
      const novel = await ctx.service.novel.createNovel(
        ctx.state.user.id,
        title,
        content
      );
      ctx.status = 201;
      ctx.body = { novel };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const novel = await ctx.service.novel.getNovel(parseInt(id), ctx.state.user.id);
      ctx.body = { novel };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      await ctx.service.novel.deleteNovel(parseInt(id), ctx.state.user.id);
      ctx.body = { message: '删除成功' };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async analyzeStyle() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const result = await ctx.service.novel.analyzeStyle(parseInt(id), ctx.state.user.id);
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async extractCharacters() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const result = await ctx.service.novel.extractCharacters(parseInt(id), ctx.state.user.id);
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateChapters() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { style, characterIds } = ctx.request.body;

    if (!style || !style.stylePrompt) {
      ctx.status = 400;
      ctx.body = { error: '请提供风格信息' };
      return;
    }

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      ctx.status = 400;
      ctx.body = { error: '请选择至少一个角色' };
      return;
    }

    try {
      const result = await ctx.service.novel.generateChapters(
        parseInt(id),
        ctx.state.user.id,
        style,
        characterIds
      );
      ctx.body = result;
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = NovelController;
