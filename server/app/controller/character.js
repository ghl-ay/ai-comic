// server/app/controller/character.js
const Controller = require('egg').Controller;

class CharacterController extends Controller {
  async index() {
    const { ctx } = this;
    const characters = await ctx.service.character.getCharacters(ctx.state.user.id);
    ctx.body = { characters };
  }

  async show() {
    const { ctx } = this;
    const { id } = ctx.params;
    const character = await ctx.service.character.getCharacter(
      parseInt(id),
      ctx.state.user.id
    );
    ctx.body = { character };
  }

  async create() {
    const { ctx } = this;
    const { name, description, appearance } = ctx.request.body;

    // 参数验证
    if (!name || !name.trim()) {
      ctx.status = 400;
      ctx.body = { error: '角色名称不能为空' };
      return;
    }

    if (name.length > 100) {
      ctx.status = 400;
      ctx.body = { error: '角色名称不能超过 100 个字符' };
      return;
    }

    try {
      const characterId = await ctx.service.character.createCharacter(
        ctx.state.user.id,
        name.trim(),
        description || '',
        appearance || ''
      );

      const character = await ctx.service.character.getCharacter(
        characterId,
        ctx.state.user.id
      );

      ctx.status = 201;
      ctx.body = { character };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { name, description, appearance } = ctx.request.body;

    // 参数验证
    if (name !== undefined && !name.trim()) {
      ctx.status = 400;
      ctx.body = { error: '角色名称不能为空' };
      return;
    }

    if (name && name.length > 100) {
      ctx.status = 400;
      ctx.body = { error: '角色名称不能超过 100 个字符' };
      return;
    }

    try {
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description;
      if (appearance !== undefined) updateData.appearance = appearance;

      const character = await ctx.service.character.updateCharacter(
        parseInt(id),
        ctx.state.user.id,
        updateData
      );

      ctx.body = { character };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async destroy() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      await ctx.service.character.deleteCharacter(
        parseInt(id),
        ctx.state.user.id
      );
      ctx.body = { message: '删除成功' };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async generateReference() {
    const { ctx } = this;
    const { id } = ctx.params;
    const { providerId } = ctx.request.body || {};

    try {
      const result = await ctx.service.character.generateReferenceImage(
        parseInt(id),
        ctx.state.user.id,
        providerId
      );

      const character = await ctx.service.character.getCharacter(
        parseInt(id),
        ctx.state.user.id
      );

      ctx.body = { character };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = CharacterController;
