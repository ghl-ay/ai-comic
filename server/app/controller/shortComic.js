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
    let { title, layout, style, stylePrompt, stylePresetId, description, script } = ctx.request.body;
    
    // 兼容处理：优先使用 stylePrompt，style 作为降级
    const finalStylePrompt = stylePrompt || style;
    if (style && !stylePrompt) {
      ctx.logger.warn('[DEPRECATED] short-comic API: use stylePrompt instead of style');
    }

    if (!title || !title.trim()) {
      ctx.status = 400;
      ctx.body = { error: '漫画标题不能为空' };
      return;
    }

    try {
      // 创建 comic（支持 stylePresetId 绑定）
      const comic = await ctx.service.comic.createComic(
        userId,
        title.trim(),
        finalStylePrompt,
        stylePresetId
      );
      const comicId = comic.id;
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
    let { title, layout, style, stylePrompt, stylePresetId, description, script } = ctx.request.body;
    
    // 兼容处理：优先使用 stylePrompt，style 作为降级
    const finalStylePrompt = stylePrompt || style;
    if (style && !stylePrompt) {
      ctx.logger.warn('[DEPRECATED] short-comic API: use stylePrompt instead of style');
    }

    const comic = await ctx.service.db.findComicByIdAndUserId(parseInt(id), userId);

    if (!comic || comic.type !== 'short') {
      ctx.status = 404;
      ctx.body = { error: '短篇漫画不存在' };
      return;
    }

    try {
      // 更新 comic（仅有漫画字段时再写）
      const updateComicData = {};
      if (title !== undefined) updateComicData.title = title;
      if (finalStylePrompt !== undefined) updateComicData.style_prompt = finalStylePrompt;
      if (Object.prototype.hasOwnProperty.call(ctx.request.body, 'stylePresetId')) {
        updateComicData.style_preset_id = stylePresetId;
      }
      if (Object.keys(updateComicData).length > 0) {
        await ctx.service.comic.updateComic(parseInt(id), userId, updateComicData);
      }

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
    const { description, providerId } = ctx.request.body;

    if (!description || !description.trim()) {
      ctx.status = 400;
      ctx.body = { error: '请输入剧情描述' };
      return;
    }

    try {
      const optimizedPrompt = await ctx.service.aiText.optimizePrompt({
        description,
        providerId,
      });
      ctx.body = { data: { optimizedPrompt } };
    } catch (err) {
      ctx.logger.error('AI optimize prompt error:', err);
      ctx.status = err.status || 500;
      ctx.body = { error: err.message || 'AI 优化失败' };
    }
  }

  async generateScript() {
    const { ctx } = this;
    const { prompt, layout, providerId } = ctx.request.body;

    if (!prompt || !prompt.trim()) {
      ctx.status = 400;
      ctx.body = { error: '请输入分镜提示词' };
      return;
    }

    try {
      const layoutType = parseInt(layout) || 4;
      const scriptObject = await ctx.service.aiText.generateShortScript({
        prompt,
        layoutType,
        providerId,
      });
      const script = JSON.stringify(scriptObject, null, 2);
      ctx.body = { data: { script } };
    } catch (err) {
      ctx.logger.error('AI generate script error:', err);
      ctx.status = err.status || 500;
      ctx.body = { error: err.message || '脚本生成失败' };
    }
  }

  async generateImage() {
    const { ctx } = this;
    let { comicId, script, style, stylePrompt, layout, providerId } = ctx.request.body;
    const userId = ctx.state.user.id;
    
    // 兼容处理：优先使用 stylePrompt，style 作为降级
    const finalStylePrompt = stylePrompt || style;
    if (style && !stylePrompt) {
      ctx.logger.warn('[DEPRECATED] short-comic API: use stylePrompt instead of style');
    }

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
      const layoutType = parseInt(layout) || 4;
      const defaultStylePrompt = await ctx.service.stylePreset.getDefaultStylePrompt();
      const usedStylePrompt = finalStylePrompt || defaultStylePrompt;

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

      const { localPath: styleCoverLocalPath } =
        ctx.service.stylePreset.resolveStyleCoverLocalPath(comic.style_preset_id);

      const result = await ctx.service.aiImage.generateComicPage({
        comicTitle: comic.title,
        stylePrompt: usedStylePrompt,
        layoutType,
        chapterPrompt,
        script: parsedScript,
        characterReferences: [],
        previousChapter: null,
        styleCoverLocalPath,
        providerId,
      });

      const filename = result.imagePath;

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
      ctx.status = err.status || 500;
      ctx.body = { error: err.message || '图片生成失败' };
    }
  }
}

module.exports = ShortComicController;
