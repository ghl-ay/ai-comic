// server/app/service/chapter.js
const Service = require('egg').Service;
const path = require('path');
const fs = require('fs');

class ChapterService extends Service {
  async createChapter(comicId, userId, title, layoutType) {
    // 验证漫画所有权
    const comic = await this.ctx.service.db.findComicByIdAndUserId(comicId, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在');
    }

    // 获取最新章节号
    const latestChapter = await this.ctx.service.db.findLatestChapter(comicId);
    const chapterNumber = latestChapter ? latestChapter.chapter_number + 1 : 1;

    const chapterId = await this.ctx.service.db.createChapter(
      comicId,
      chapterNumber,
      title?.trim() || `第${chapterNumber}章`,
      layoutType || 4
    );

    return await this.ctx.service.db.findChapterById(chapterId);
  }

  async getChapter(id) {
    const chapter = await this.ctx.service.db.findChapterById(id);
    if (!chapter) {
      this.ctx.throw(404, '章节不存在');
    }
    return chapter;
  }

  async getChapterWithComic(id, userId) {
    const chapter = await this.ctx.service.db.findChapterById(id);
    if (!chapter) {
      this.ctx.throw(404, '章节不存在');
    }

    const comic = await this.ctx.service.db.findComicByIdAndUserId(chapter.comic_id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权访问');
    }

    chapter.comic = comic;
    return chapter;
  }

  async updateChapter(id, userId, data) {
    const chapter = await this.ctx.service.db.findChapterById(id);
    if (!chapter) {
      this.ctx.throw(404, '章节不存在');
    }

    // 验证所有权
    const comic = await this.ctx.service.db.findComicByIdAndUserId(chapter.comic_id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权修改');
    }

    await this.ctx.service.db.updateChapter(id, data);
    return await this.ctx.service.db.findChapterById(id);
  }

  async deleteChapter(id, userId) {
    const chapter = await this.ctx.service.db.findChapterById(id);
    if (!chapter) {
      this.ctx.throw(404, '章节不存在');
    }

    // 验证所有权
    const comic = await this.ctx.service.db.findComicByIdAndUserId(chapter.comic_id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权删除');
    }

    // 删除图片文件
    if (chapter.page_image) {
      const imagePath = path.join(this.app.config.comicImageDir || 'public/images/comics', chapter.page_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await this.ctx.service.db.deleteChapter(id);
  }

  async generateScript(chapterId, userId, prompt, characterIds, providerId = null) {
    const chapter = await this.getChapterWithComic(chapterId, userId);

    // 存储用户输入的提示词和角色ID
    await this.ctx.service.db.updateChapter(chapterId, {
      chapter_prompt: prompt,
      character_ids: JSON.stringify(characterIds),
    });

    // 获取角色信息
    const characters = [];
    for (const charId of characterIds) {
      const char = await this.ctx.service.db.findCharacterByIdAndUserId(charId, userId);
      if (char) {
        characters.push(char);
      }
    }

    // 获取上一章脚本（如果有）
    let previousChapterScript = null;
    if (chapter.chapter_number > 1) {
      const chapters = await this.ctx.service.db.findChaptersByComicId(chapter.comic_id);
      const prevChapter = chapters.find(c => c.chapter_number === chapter.chapter_number - 1);
      if (prevChapter && prevChapter.script_content) {
        previousChapterScript = JSON.parse(prevChapter.script_content);
      }
    }

    // 调用 AI 生成脚本
    const script = await this.ctx.service.aiText.generateScript({
      chapterPrompt: prompt,
      layoutType: chapter.layout_type,
      characters,
      previousChapterScript,
      providerId,
    });

    // 保存脚本
    await this.ctx.service.db.updateChapter(chapterId, {
      script_content: JSON.stringify(script),
      status: 'script_ready',
    });

    return script;
  }

  async generateImage(chapterId, userId, providerId = null) {
    const chapter = await this.getChapterWithComic(chapterId, userId);

    if (!chapter.script_content) {
      this.ctx.throw(400, '请先生成分镜脚本');
    }

    const script = JSON.parse(chapter.script_content);

    // 获取漫画信息
    const comic = await this.ctx.service.db.findComicById(chapter.comic_id);

    // 获取上一章信息（如果有）
    let previousChapter = null;
    if (chapter.chapter_number > 1) {
      const chapters = await this.ctx.service.db.findChaptersByComicId(chapter.comic_id);
      const prevChapter = chapters.find(c => c.chapter_number === chapter.chapter_number - 1);
      if (prevChapter) {
        previousChapter = {
          chapterPrompt: prevChapter.chapter_prompt || '',
          script: prevChapter.script_content ? JSON.parse(prevChapter.script_content) : null,
          image: prevChapter.page_image || null,
        };
      }
    }

    // 获取角色参考图（只获取脚本中出场的角色）
    const characterRefs = [];
    const charIds = new Set();
    for (const panel of script.panels) {
      for (const charId of panel.characters) {
        charIds.add(charId);
      }
    }

    for (const charId of charIds) {
      const char = await this.ctx.service.db.findCharacterByIdAndUserId(charId, userId);
      if (char) {
        characterRefs.push({
          id: char.id,
          name: char.name,
          description: char.description,
          appearance: char.appearance,
          imageUrl: char.reference_image || '',
        });
      }
    }

    // 调用 AI 图片服务
    const defaultStylePrompt = await this.ctx.service.stylePreset.getDefaultStylePrompt();
    const result = await this.ctx.service.aiImage.generateComicPage({
      comicTitle: comic.title,
      stylePrompt: comic.style_prompt || defaultStylePrompt,
      layoutType: chapter.layout_type,
      chapterPrompt: chapter.chapter_prompt || '',
      script,
      characterReferences: characterRefs,
      previousChapter,
      providerId,
    });

    // 更新章节
    await this.ctx.service.db.updateChapter(chapterId, {
      page_image: result.imagePath,
      status: 'completed',
    });

    // 更新漫画封面（如果是第一章）
    if (chapter.chapter_number === 1) {
      await this.ctx.service.db.updateComic(chapter.comic_id, userId, {
        cover_image: result.imagePath,
      });
    }

    return result;
  }

  async generateChapterPrompt(chapterId, userId, characterIds, providerId = null) {
    const chapter = await this.getChapterWithComic(chapterId, userId);

    // 获取角色信息
    const characters = [];
    for (const charId of characterIds) {
      const char = await this.ctx.service.db.findCharacterByIdAndUserId(charId, userId);
      if (char) {
        characters.push(char);
      }
    }

    if (characters.length === 0) {
      this.ctx.throw(400, '请选择至少一个角色');
    }

    // 获取上一章脚本（如果有）
    let previousChapterScript = null;
    if (chapter.chapter_number > 1) {
      const chapters = await this.ctx.service.db.findChaptersByComicId(chapter.comic_id);
      const prevChapter = chapters.find(c => c.chapter_number === chapter.chapter_number - 1);
      if (prevChapter && prevChapter.script_content) {
        previousChapterScript = JSON.parse(prevChapter.script_content);
      }
    }

    // 调用 AI 生成章节提示词
    const prompt = await this.ctx.service.aiText.generateChapterPrompt({
      characters,
      previousChapterScript,
      providerId,
    });

    return { prompt };
  }
}

module.exports = ChapterService;
