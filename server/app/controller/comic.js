// server/app/controller/comic.js
const Controller = require('egg').Controller;

class ComicController extends Controller {
  async index() {
    const { ctx } = this;
    const comics = await ctx.service.comic.getComics(ctx.state.user.id);
    ctx.body = { comics };
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const comic = await ctx.service.comic.getComic(parseInt(id), ctx.state.user.id);
    ctx.body = { comic };
  }

  async create() {
    const { ctx } = this;
    const { title, stylePrompt } = ctx.request.body;

    if (!title || !title.trim()) {
      ctx.status = 400;
      ctx.body = { error: '漫画标题不能为空' };
      return;
    }

    try {
      const comic = await ctx.service.comic.createComic(
        ctx.state.user.id,
        title,
        stylePrompt
      );
      ctx.status = 201;
      ctx.body = { comic };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { title, stylePrompt, status } = ctx.request.body;

    try {
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (stylePrompt !== undefined) updateData.style_prompt = stylePrompt;
      if (status !== undefined) updateData.status = status;

      const comic = await ctx.service.comic.updateComic(
        parseInt(id),
        ctx.state.user.id,
        updateData
      );
      ctx.body = { comic };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      await ctx.service.comic.deleteComic(parseInt(id), ctx.state.user.id);
      ctx.body = { message: '删除成功' };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = ComicController;
