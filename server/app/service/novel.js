// server/app/service/novel.js
const Service = require('egg').Service;

class NovelService extends Service {
  async createNovel(userId, title, content) {
    const novelId = await this.ctx.service.db.createNovel(userId, title, content);
    return await this.ctx.service.db.findNovelById(novelId);
  }

  async getNovel(id, userId) {
    const novel = await this.ctx.service.db.findNovelByIdAndUserId(id, userId);
    if (!novel) {
      this.ctx.throw(404, '小说不存在');
    }
    return novel;
  }

  async deleteNovel(id, userId) {
    const deleted = await this.ctx.service.db.deleteNovel(id, userId);
    if (!deleted) {
      this.ctx.throw(404, '小说不存在或无权删除');
    }
  }

  async analyzeStyle(novelId, userId, providerId = null) {
    const novel = await this.getNovel(novelId, userId);
    const AiTextService = require('./ai-text');

    const systemPrompt = `你是专业的漫画编辑，请根据小说内容推荐合适的漫画风格和标题。
输出要求：
1. 标题要简短有力，适合作为漫画标题
2. 风格提示词要具体，如：日系黑白漫画风格、美式彩色卡通风格等

请以 JSON 格式输出，不要包含任何其他文字：
{ "title": "漫画标题", "stylePrompt": "风格描述" }`;

    const userPrompt = `请分析以下小说内容，生成漫画标题和风格提示词：

${novel.content.substring(0, 3000)}`;

    try {
      const { content } = await this.ctx.service.aiText.chat({
        providerId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        responseFormat: 'json_object',
      });

      const result = AiTextService.parseJsonObject(content);
      const defaultStylePrompt = await this.ctx.service.stylePreset.getDefaultStylePrompt();

      return {
        title: result.title || novel.title || '未命名漫画',
        stylePrompt: result.stylePrompt || defaultStylePrompt,
      };
    } catch (err) {
      if (err.status) throw err;
      this.ctx.logger.error('AI analyze style error:', err);
      this.ctx.throw(500, `AI 分析失败: ${err.message}`);
    }
  }

  async extractCharacters(novelId, userId, providerId = null) {
    const novel = await this.getNovel(novelId, userId);
    const AiTextService = require('./ai-text');

    const systemPrompt = `你是专业的漫画编辑，请从小说中提取主要角色。
输出要求：
1. 最多提取 5 个主要角色
2. 每个角色包含：名称、性格描述、外观描述
3. 外观描述要具体，包含发型、服装、特征等，用于生成角色参考图

请以 JSON 格式输出：
{ "characters": [{ "name": "角色名", "description": "性格描述", "appearance": "外观描述" }] }`;

    const userPrompt = `请从以下小说中提取主要角色：

${novel.content.substring(0, 3000)}`;

    try {
      const { content } = await this.ctx.service.aiText.chat({
        providerId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        responseFormat: 'json_object',
      });

      const result = AiTextService.parseJsonObject(content);

      return {
        characters: (result.characters || []).map((char, index) => ({
          id: index + 1,
          name: char.name || `角色${index + 1}`,
          description: char.description || '',
          appearance: char.appearance || '',
        })),
      };
    } catch (err) {
      if (err.status) throw err;
      this.ctx.logger.error('AI extract characters error:', err);
      this.ctx.throw(500, `AI 提取角色失败: ${err.message}`);
    }
  }

  async generateChapters(novelId, userId, style, characterIds, providerId = null) {
    const novel = await this.getNovel(novelId, userId);
    const AiTextService = require('./ai-text');

    const characters = [];
    for (const charId of characterIds) {
      const char = await this.ctx.service.db.findCharacterByIdAndUserId(charId, userId);
      if (char) {
        characters.push({ id: char.id, name: char.name, appearance: char.appearance });
      }
    }

    const systemPrompt = `你是专业的漫画编剧，请将小说改编为漫画章节。
输出要求：
1. 每个章节控制在合理长度
2. 每个章节包含：标题、描述、分格数量(4/6/8)、出场角色ID列表、章节提示词
3. 章节提示词用于后续生成具体的分镜脚本，要包含场景、剧情要点

请以 JSON 格式输出：
{ "chapters": [{ "title": "章节标题", "description": "章节描述", "layoutType": 6, "characterIds": [1, 2], "chapterPrompt": "用于生成脚本的提示词" }] }`;

    const userPrompt = `请将以下小说改编为漫画章节：

小说内容：
${novel.content.substring(0, 3000)}

风格：${style.stylePrompt || '日系黑白漫画'}

角色列表：
${JSON.stringify(characters, null, 2)}`;

    try {
      const { content } = await this.ctx.service.aiText.chat({
        providerId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        responseFormat: 'json_object',
      });

      const result = AiTextService.parseJsonObject(content);

      return {
        chapters: (result.chapters || []).map((ch, index) => ({
          chapterNumber: index + 1,
          title: ch.title || `第${index + 1}章`,
          description: ch.description || '',
          layoutType: ch.layoutType || 4,
          characterIds: ch.characterIds || [],
          chapterPrompt: ch.chapterPrompt || '',
        })),
      };
    } catch (err) {
      if (err.status) throw err;
      this.ctx.logger.error('AI generate chapters error:', err);
      this.ctx.throw(500, `AI 生成章节失败: ${err.message}`);
    }
  }
}

module.exports = NovelService;
