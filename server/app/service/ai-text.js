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

      const content = response.choices[0].message.content;
      const script = AiTextService.parseScriptContent(content, layoutType);

      return script;
    } catch (err) {
      this.ctx.logger.error('AI text generation error:', err);
      this.ctx.throw(500, `AI 脚本生成失败: ${err.message}`);
    }
  }
}

module.exports = AiTextService;
