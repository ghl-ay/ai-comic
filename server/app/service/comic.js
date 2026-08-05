// server/app/service/comic.js
const Service = require('egg').Service;

class ComicService extends Service {
  _mapStylePreset(presetRow) {
    if (!presetRow) return null;
    return {
      id: presetRow.id,
      code: presetRow.code,
      name: presetRow.name,
      coverImage: presetRow.cover_image,
      stylePrompt: presetRow.style_prompt,
      description: presetRow.description,
    };
  }

  /**
   * 附加风格预设（单条），并统一 stylePresetId camelCase 别名
   */
  attachStylePreset(comic, presetMap = null) {
    if (!comic) return comic;

    let presetRow = null;
    if (comic.style_preset_id) {
      if (presetMap) {
        presetRow = presetMap.get(comic.style_preset_id) || null;
      } else {
        presetRow = this.app.db.prepare(
          'SELECT id, code, name, cover_image, style_prompt, description FROM style_presets WHERE id = ?'
        ).get(comic.style_preset_id);
      }
    }

    comic.stylePreset = this._mapStylePreset(presetRow);
    comic.stylePresetId = comic.style_preset_id ?? null;
    return comic;
  }

  /**
   * 批量附加风格预设，避免列表 N+1
   */
  attachStylePresets(comics) {
    if (!comics || comics.length === 0) return comics;

    const uniqueIds = [
      ...new Set(
        comics.map(comic => comic.style_preset_id).filter(id => id != null)
      ),
    ];
    let presetMap = new Map();
    if (uniqueIds.length > 0) {
      const placeholders = uniqueIds.map(() => '?').join(', ');
      const presets = this.app.db.prepare(
        `SELECT id, code, name, cover_image, style_prompt, description
         FROM style_presets WHERE id IN (${placeholders})`
      ).all(...uniqueIds);
      presetMap = new Map(presets.map(preset => [preset.id, preset]));
    }

    for (const comic of comics) {
      this.attachStylePreset(comic, presetMap);
    }
    return comics;
  }

  /**
   * @param {number} userId
   * @param {string} title
   * @param {string} [stylePrompt]
   * @param {number|null|undefined} stylePresetId - undefined=默认规则; null=解绑/自定义; number=绑定
   */
  async createComic(userId, title, stylePrompt, stylePresetId) {
    if (!title || !title.trim()) {
      this.ctx.throw(400, '漫画标题不能为空');
    }

    const binding = await this.ctx.service.stylePreset.resolveStyleBinding({
      mode: 'create',
      stylePrompt,
      stylePresetId,
      stylePresetIdProvided: stylePresetId !== undefined,
    });

    const comicId = await this.ctx.service.db.createComic(
      userId,
      title.trim(),
      binding.stylePrompt,
      binding.stylePresetId
    );

    const comic = await this.ctx.service.db.findComicById(comicId);
    return this.attachStylePreset(comic);
  }

  async getComics(userId) {
    const comics = await this.ctx.service.db.findComicsByUserId(userId);

    for (const comic of comics) {
      comic.chapterCount = await this.ctx.service.db.countChaptersByComicId(comic.id);
    }

    this.attachStylePresets(comics);
    return comics;
  }

  async getComic(id, userId) {
    const comic = await this.ctx.service.db.findComicByIdAndUserId(id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在');
    }

    comic.chapters = await this.ctx.service.db.findChaptersByComicId(id);
    return this.attachStylePreset(comic);
  }

  async updateComic(id, userId, data) {
    const existing = await this.ctx.service.db.findComicByIdAndUserId(id, userId);
    if (!existing) {
      this.ctx.throw(404, '漫画不存在或无权修改');
    }

    const updateData = { ...data };
    delete updateData.stylePrompt;
    delete updateData.stylePresetId;

    const stylePresetIdProvided = Object.prototype.hasOwnProperty.call(data, 'style_preset_id');
    const stylePromptProvided = Object.prototype.hasOwnProperty.call(data, 'style_prompt');

    if (stylePresetIdProvided || stylePromptProvided) {
      const binding = await this.ctx.service.stylePreset.resolveStyleBinding({
        mode: 'update',
        stylePrompt: stylePromptProvided ? data.style_prompt : undefined,
        stylePresetId: data.style_preset_id,
        stylePresetIdProvided,
        existing,
      });

      if (binding.stylePrompt !== undefined) {
        updateData.style_prompt = binding.stylePrompt;
      }
      if (binding.stylePresetId !== undefined) {
        updateData.style_preset_id = binding.stylePresetId;
      }
    }

    const updated = await this.ctx.service.db.updateComic(id, userId, updateData);
    if (!updated) {
      this.ctx.throw(404, '漫画不存在或无权修改');
    }
    const comic = await this.ctx.service.db.findComicByIdAndUserId(id, userId);
    return this.attachStylePreset(comic);
  }

  async deleteComic(id, userId) {
    const comic = await this.ctx.service.db.findComicByIdAndUserId(id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权删除');
    }

    const deleted = await this.ctx.service.db.deleteComic(id, userId);
    if (!deleted) {
      this.ctx.throw(500, '删除漫画失败');
    }
  }
}

module.exports = ComicService;
