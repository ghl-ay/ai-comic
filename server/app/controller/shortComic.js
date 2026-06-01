// server/app/controller/shortComic.js
const Controller = require('egg').Controller;

class ShortComicController extends Controller {
  static removeThinkTags(content) {
    if (typeof content !== 'string') return content;
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }

  static removeCodeBlockMarkers(content) {
    if (typeof content !== 'string') return content;
    // 去除 ```json 和 ``` 标记
    return content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }

  async get() {
    const { ctx } = this;
    const { id } = ctx.params;
    const userId = ctx.state.user.id;

    const comic = await ctx.service.db.findComicByIdAndUserId(parseInt(id), userId);

    if (!comic || comic.type !== 'short') {
      ctx.status = 404;
      ctx.body = { error: '短篇漫画不存在' };
      return;
    }

    const chapter = await ctx.service.db.findChapterByComicId(comic.id);

    ctx.body = {
      data: {
        ...comic,
        chapter_id: chapter?.id,
        layout_type: chapter?.layout_type || 4,
        chapter_prompt: chapter?.chapter_prompt || '',
        script_content: chapter?.script_content || '',
        page_image: chapter?.page_image || null
      }
    };
  }

  async create() {
    const { ctx } = this;
    const userId = ctx.state.user.id;
    const { title, layout, style, description, script } = ctx.request.body;

    if (!title || !title.trim()) {
      ctx.status = 400;
      ctx.body = { error: '漫画标题不能为空' };
      return;
    }

    try {
      // 创建 comic
      const comicId = await ctx.service.db.createComic(userId, title.trim(), style);
      await ctx.service.db.updateComic(comicId, userId, { type: 'short' });

      // 创建 chapter
      const layoutType = parseInt(layout) || 4;
      await ctx.service.db.createChapter(comicId, 1, '短篇漫画', layoutType);
      const chapter = await ctx.service.db.findChapterByComicId(comicId);

      if (chapter) {
        await ctx.service.db.updateChapter(chapter.id, {
          chapter_prompt: description || '',
          script_content: script || ''
        });
      }

      ctx.status = 201;
      ctx.body = { data: { id: comicId } };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async update() {
    const { ctx } = this;
    const { id } = ctx.params;
    const userId = ctx.state.user.id;
    const { title, layout, style, description, script } = ctx.request.body;

    const comic = await ctx.service.db.findComicByIdAndUserId(parseInt(id), userId);

    if (!comic || comic.type !== 'short') {
      ctx.status = 404;
      ctx.body = { error: '短篇漫画不存在' };
      return;
    }

    try {
      // 更新 comic
      const updateComicData = {};
      if (title !== undefined) updateComicData.title = title;
      if (style !== undefined) updateComicData.style_prompt = style;
      await ctx.service.db.updateComic(parseInt(id), userId, updateComicData);

      // 更新 chapter
      const chapter = await ctx.service.db.findChapterByComicId(comic.id);
      if (chapter) {
        const updateChapterData = {};
        if (layout !== undefined) updateChapterData.layout_type = parseInt(layout);
        if (description !== undefined) updateChapterData.chapter_prompt = description;
        if (script !== undefined) updateChapterData.script_content = script;
        await ctx.service.db.updateChapter(chapter.id, updateChapterData);
      }

      ctx.body = { data: { success: true } };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }

  async optimizePrompt() {
    const { ctx } = this;
    const { description } = ctx.request.body;

    if (!description || !description.trim()) {
      ctx.status = 400;
      ctx.body = { error: '请输入剧情描述' };
      return;
    }

    try {
      const aiConfig = await ctx.service.aiText.getClient();
      if (!aiConfig) {
        ctx.status = 500;
        ctx.body = { error: 'AI 文本服务未配置' };
        return;
      }

      const { client, model } = aiConfig;

      const systemPrompt = `你是一个专业的漫画编剧助手。你的任务是优化用户提供的漫画剧情描述。

请直接返回优化后的剧情描述文本，不要包含任何评价、解释、标题或前缀。

优化要求：
1. 保持原始故事核心不变
2. 增加场景细节、角色动作、表情描述
3. 使描述更适合转化为漫画分镜
4. 长度控制在200-500字

示例输入：一个女孩在公园遇到一只猫
示例输出：阳光明媚的午后，一位穿着校服的少女漫步在公园的林荫小道上。她突然发现长椅旁蹲着一只橘色的流浪猫，正用圆溜溜的眼睛好奇地望着她。少女蹲下身，轻轻伸出手，猫咪犹豫片刻，慢慢靠近她的指尖。`;

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description }
        ],
        temperature: 0.7
      });

      const rawContent = response.choices[0].message.content;
      const optimizedPrompt = ShortComicController.removeThinkTags(rawContent);
      ctx.body = { data: { optimizedPrompt } };
    } catch (err) {
      ctx.logger.error('AI optimize prompt error:', err);
      ctx.status = 500;
      ctx.body = { error: 'AI 优化失败: ' + err.message };
    }
  }

  async generateScript() {
    const { ctx } = this;
    const { prompt, layout } = ctx.request.body;

    if (!prompt || !prompt.trim()) {
      ctx.status = 400;
      ctx.body = { error: '请输入分镜提示词' };
      return;
    }

    try {
      const aiConfig = await ctx.service.aiText.getClient();
      if (!aiConfig) {
        ctx.status = 500;
        ctx.body = { error: 'AI 文本服务未配置' };
        return;
      }

      const { client, model } = aiConfig;
      const layoutType = parseInt(layout) || 4;

      const systemPrompt = `你是一个专业漫画脚本编剧。根据用户提供的剧情描述，生成分镜脚本。

输出要求：
1. 生成 ${layoutType} 格分镜
2. 每格包含：场景描述、对白内容
3. 场景描述要具体，包含环境、光影、角色动作
4. 对白要简洁有戏剧张力

输出 JSON 格式，不要包含任何其他文字：
{
  "panels": [
    {
      "number": 1,
      "scene": "场景描述",
      "dialogue": "对白内容"
    }
  ]
}`;

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      const rawContent = response.choices[0].message.content;
      const cleanedContent = ShortComicController.removeThinkTags(rawContent);
      const jsonContent = ShortComicController.removeCodeBlockMarkers(cleanedContent);
      const script = JSON.stringify(JSON.parse(jsonContent), null, 2);

      ctx.body = { data: { script } };
    } catch (err) {
      ctx.logger.error('AI generate script error:', err);
      ctx.status = 500;
      ctx.body = { error: '脚本生成失败: ' + err.message };
    }
  }

  async generateImage() {
    const { ctx } = this;
    const { comicId, script, style, layout } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!comicId) {
      ctx.status = 400;
      ctx.body = { error: '缺少漫画ID' };
      return;
    }

    const comic = await ctx.service.db.findComicByIdAndUserId(parseInt(comicId), userId);
    if (!comic || comic.type !== 'short') {
      ctx.status = 404;
      ctx.body = { error: '短篇漫画不存在' };
      return;
    }

    try {
      const config = await ctx.service.aiImage.getClient();
      if (!config) {
        ctx.status = 500;
        ctx.body = { error: 'AI 图片服务未配置' };
        return;
      }

      const { createImageProvider } = require('../providers');
      const BaseImageProvider = require('../providers/base');
      const provider = createImageProvider(config.apiFormat, config);

      const layoutType = parseInt(layout) || 4;
      const stylePrompt = style || '彩色漫画';

      // 获取章节提示词
      const chapter = await ctx.service.db.findChapterByComicId(comic.id);
      const chapterPrompt = chapter?.chapter_prompt || '';

      // 解析脚本，确保有正确的格式
      let parsedScript = null;
      if (script) {
        try {
          parsedScript = typeof script === 'string' ? JSON.parse(script) : script;
        } catch (e) {
          ctx.logger.warn('Failed to parse script:', e);
        }
      }

      // 如果没有脚本，创建一个默认的空脚本
      if (!parsedScript || !parsedScript.panels) {
        parsedScript = {
          panels: Array.from({ length: layoutType }, (_, i) => ({
            number: i + 1,
            scene: '',
            dialogue: ''
          }))
        };
      }

      const prompt = BaseImageProvider.buildComicPagePrompt({
        comicTitle: comic.title,
        stylePrompt,
        layoutType,
        chapterPrompt,
        script: parsedScript,
        characterReferences: [],
        previousChapter: null
      });

      const result = await provider.generateImage({ prompt });

      let imageBuffer;
      if (result.imageBuffer) {
        imageBuffer = result.imageBuffer;
      } else if (result.imageUrl) {
        imageBuffer = await BaseImageProvider.downloadImage(result.imageUrl);
      }

      const filename = `short_${comicId}_${Date.now()}.png`;
      const imageDir = this.app.config.comicImageDir || 'public/images/comics';
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(imageDir)) {
        fs.mkdirSync(imageDir, { recursive: true });
      }

      const filepath = path.join(imageDir, filename);
      fs.writeFileSync(filepath, imageBuffer);

      // 更新 chapter
      if (chapter) {
        await ctx.service.db.updateChapter(chapter.id, {
          page_image: filename
        });
      }

      // 更新 cover_image
      await ctx.service.db.updateComic(parseInt(comicId), userId, {
        cover_image: filename
      });

      ctx.body = { data: { imageUrl: `/images/comics/${filename}` } };
    } catch (err) {
      ctx.logger.error('AI image generation error:', err);
      ctx.status = 500;
      ctx.body = { error: '图片生成失败: ' + err.message };
    }
  }
}

module.exports = ShortComicController;
