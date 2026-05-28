// server/app/service/ai-text.js
const Service = require('egg').Service;
const OpenAI = require('openai');

class AiTextService extends Service {
  static parseScriptContent(content, layoutType) {
    const script = AiTextService.parseJsonObject(content);

    // 验证并规范化输出
    if (!script.panels || !Array.isArray(script.panels)) {
      throw new Error('AI 返回的脚本格式不正确');
    }

    // 确保分镜数量正确
    script.panels = script.panels.slice(0, layoutType);

    // 确保每个分镜有正确的字段
    script.panels = script.panels.map((panel, index) => ({
      number: index + 1,
      scene: panel.scene || '',
      dialogue: panel.dialogue || '',
      characters: Array.isArray(panel.characters) ? panel.characters : [],
    }));

    // 如果分镜数量不足，补充空分镜
    while (script.panels.length < layoutType) {
      script.panels.push({
        number: script.panels.length + 1,
        scene: '',
        dialogue: '',
        characters: [],
      });
    }

    return script;
  }

  static parseJsonObject(content) {
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('AI 返回内容为空');
    }

    try {
      return JSON.parse(content);
    } catch (_) {
      // Some OpenAI-compatible providers may prepend thinking text even when
      // response_format=json_object is requested.
    }

    for (const candidate of AiTextService.findJsonObjectCandidates(content)) {
      try {
        return JSON.parse(candidate);
      } catch (_) {
        // Keep looking; earlier braces may come from non-JSON thinking text.
      }
    }

    throw new Error('AI 返回的脚本不是有效 JSON');
  }

  static * findJsonObjectCandidates(content) {
    for (let start = content.indexOf('{'); start !== -1; start = content.indexOf('{', start + 1)) {
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let index = start; index < content.length; index++) {
        const char = content[index];

        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (char === '\\') {
            escaped = true;
          } else if (char === '"') {
            inString = false;
          }
          continue;
        }

        if (char === '"') {
          inString = true;
        } else if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            yield content.slice(start, index + 1);
            break;
          }
        }
      }
    }
  }

  async getClient() {
    // 从数据库获取全局配置
    const config = await this.ctx.service.aiConfig.getAiConfigWithKey('text');

    if (!config || !config.apiKey) {
      // 回退到环境变量
      const envConfig = {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com',
        model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o',
      };

      if (!envConfig.apiKey) {
        return null;
      }

      return {
        client: new OpenAI({
          apiKey: envConfig.apiKey,
          baseURL: envConfig.baseURL,
        }),
        model: envConfig.model,
      };
    }

    return {
      client: new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      }),
      model: config.model,
    };
  }

  async generateScript(params) {
    const { chapterPrompt, layoutType, characters, previousChapterScript } = params;

    const aiConfig = await this.getClient();
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 文本服务未配置');
    }

    const { client, model } = aiConfig;

    const systemPrompt = `你是一个专业漫画脚本编剧。根据用户提供的章节提示词、分镜数量、出场角色，生成完整的分镜脚本。

输出要求：
1. 严格按照指定的分镜数量生成
2. 每格包含：场景描述、对白内容、出场角色ID列表
3. 场景描述要具体，包含环境、光影、角色动作
4. 对白要简洁有戏剧张力
5. 保持角色性格一致
6. 如有上一章内容，保持剧情连贯

输出 JSON 格式，不要包含任何其他文字：
{
  "title": "章节标题",
  "panels": [
    {
      "number": 1,
      "scene": "场景描述",
      "dialogue": "角色名：对白内容",
      "characters": [角色ID]
    }
  ]
}`;

    let userPrompt = `章节提示词：${chapterPrompt}
分镜数量：${layoutType} 格
出场角色：${JSON.stringify(characters.map(c => ({ id: c.id, name: c.name, appearance: c.appearance })))}`;

    if (previousChapterScript) {
      userPrompt += `\n上一章脚本：${JSON.stringify(previousChapterScript)}`;
    }

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });

      const rawContent = response.choices[0].message.content;
      const content = AiTextService.removeThinkTags(rawContent);
      const script = AiTextService.parseScriptContent(content, layoutType);

      return script;
    } catch (err) {
      this.ctx.logger.error('AI text generation error:', err);
      this.ctx.throw(500, `AI 脚本生成失败: ${err.message}`);
    }
  }

  async fillForm(params) {
    const { schema, context } = params;

    const aiConfig = await this.getClient();
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 文本服务未配置');
    }

    const { client, model } = aiConfig;

    const systemPrompt = `你是一个智能表单填充助手。根据用户提供的信息，自动填充表单字段。

要求：
1. 根据 schema 中的字段描述生成合适的内容
2. 生成的内容要符合字段的用途和格式
3. 只输出 JSON，不要有任何其他文字
4. 内容要丰富、有创意、符合常理

输出格式示例：
{"字段1": "内容1", "字段2": "内容2"}`;

    const userPrompt = `表单字段定义：
${JSON.stringify(schema, null, 2)}

上下文信息：
${context}

请直接输出 JSON：`;

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const rawContent = response.choices[0].message.content;
      this.ctx.logger.info('AI fillForm raw response:', rawContent);

      const content = AiTextService.removeThinkTags(rawContent);
      return AiTextService.parseJsonObject(content);
    } catch (err) {
      this.ctx.logger.error('AI form fill error:', err);
      this.ctx.throw(500, `AI 表单填充失败: ${err.message}`);
    }
  }

  async generateChapterPrompt(params) {
    const { characters, previousChapterScript } = params;

    const aiConfig = await this.getClient();
    if (!aiConfig) {
      this.ctx.throw(500, 'AI 文本服务未配置');
    }

    const { client, model } = aiConfig;

    const systemPrompt = `你是一个漫画编剧助手。根据提供的角色信息和上一章节的剧情，续写本章节的剧情提示词。

要求：
1. 承接上一章节的剧情（如有）
2. 保持角色性格一致
3. 有戏剧冲突或情节推进
4. 描述本章的主要事件（50-100字）
5. 直接输出章节提示词文本，不要有其他内容`;

    let userPrompt = `【角色信息】\n`;
    for (const char of characters) {
      userPrompt += `角色：${char.name}\n`;
      if (char.description) userPrompt += `- 描述：${char.description}\n`;
      if (char.appearance) userPrompt += `- 外观：${char.appearance}\n`;
      userPrompt += '\n';
    }

    if (previousChapterScript && previousChapterScript.panels) {
      userPrompt += `【上一章节分镜脚本】\n`;
      for (const panel of previousChapterScript.panels) {
        userPrompt += `第${panel.number}格：\n`;
        if (panel.scene) userPrompt += `- 场景：${panel.scene}\n`;
        if (panel.dialogue) userPrompt += `- 对白：${panel.dialogue}\n`;
        if (panel.characters && panel.characters.length > 0) {
          userPrompt += `- 出场角色：${panel.characters.join(', ')}\n`;
        }
        userPrompt += '\n';
      }
    }

    userPrompt += `请续写本章节的剧情提示词：`;

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      });

      const rawContent = response.choices[0].message.content;
      const content = AiTextService.removeThinkTags(rawContent);
      return content.trim();
    } catch (err) {
      this.ctx.logger.error('AI chapter prompt generation error:', err);
      this.ctx.throw(500, `AI 章节提示词生成失败: ${err.message}`);
    }
  }

  static removeThinkTags(content) {
    if (typeof content !== 'string') return content;
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }
}

module.exports = AiTextService;
