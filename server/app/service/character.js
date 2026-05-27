// server/app/service/character.js
const Service = require('egg').Service;

class CharacterService extends Service {
  async createCharacter(userId, name, description, appearance) {
    // 创建角色（无参考图）
    const characterId = await this.ctx.service.db.createCharacter(
      userId,
      name,
      description,
      appearance
    );
    return characterId;
  }

  async generateReferenceImage(characterId, userId) {
    // 获取角色
    const character = await this.ctx.service.db.findCharacterByIdAndUserId(
      characterId,
      userId
    );

    if (!character) {
      this.ctx.throw(404, '角色不存在');
    }

    if (!character.appearance) {
      this.ctx.throw(400, '角色缺少外观描述');
    }

    // 生成参考图
    const result = await this.ctx.service.aiImage.generateCharacterReference({
      name: character.name,
      description: character.description,
      appearance: character.appearance,
    });

    // 更新角色
    await this.ctx.service.db.updateCharacter(characterId, userId, {
      reference_image: result.imagePath,
      reference_prompt: result.prompt,
    });

    return {
      imagePath: result.imagePath,
    };
  }

  async getCharacters(userId) {
    return await this.ctx.service.db.findCharactersByUserId(userId);
  }

  async getCharacter(id, userId) {
    const character = await this.ctx.service.db.findCharacterByIdAndUserId(
      id,
      userId
    );
    if (!character) {
      this.ctx.throw(404, '角色不存在');
    }
    return character;
  }

  async updateCharacter(id, userId, data) {
    const updated = await this.ctx.service.db.updateCharacter(id, userId, data);
    if (!updated) {
      this.ctx.throw(404, '角色不存在或无权修改');
    }
    return await this.ctx.service.db.findCharacterByIdAndUserId(id, userId);
  }

  async deleteCharacter(id, userId) {
    const deleted = await this.ctx.service.db.deleteCharacter(id, userId);
    if (!deleted) {
      this.ctx.throw(404, '角色不存在或无权删除');
    }
  }
}

module.exports = CharacterService;
