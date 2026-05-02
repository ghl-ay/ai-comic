// server/app/service/comic.js
const Service = require('egg').Service;

class ComicService extends Service {
  async createComic(userId, title, stylePrompt) {
    if (!title || !title.trim()) {
      this.ctx.throw(400, '漫画标题不能为空');
    }

    const comicId = await this.ctx.service.db.createComic(
      userId,
      title.trim(),
      stylePrompt?.trim() || null
    );

    return await this.ctx.service.db.findComicById(comicId);
  }

  async getComics(userId) {
    const comics = await this.ctx.service.db.findComicsByUserId(userId);

    // 为每个漫画添加章节数量
    for (const comic of comics) {
      comic.chapterCount = await this.ctx.service.db.countChaptersByComicId(comic.id);
    }

    return comics;
  }

  async getComic(id, userId) {
    const comic = await this.ctx.service.db.findComicByIdAndUserId(id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在');
    }

    // 获取章节列表
    comic.chapters = await this.ctx.service.db.findChaptersByComicId(id);

    return comic;
  }

  async updateComic(id, userId, data) {
    const updated = await this.ctx.service.db.updateComic(id, userId, data);
    if (!updated) {
      this.ctx.throw(404, '漫画不存在或无权修改');
    }
    return await this.ctx.service.db.findComicByIdAndUserId(id, userId);
  }

  async deleteComic(id, userId) {
    const comic = await this.ctx.service.db.findComicByIdAndUserId(id, userId);
    if (!comic) {
      this.ctx.throw(404, '漫画不存在或无权删除');
    }

    // 删除漫画会级联删除所有章节
    const deleted = await this.ctx.service.db.deleteComic(id, userId);
    if (!deleted) {
      this.ctx.throw(500, '删除漫画失败');
    }
  }
}

module.exports = ComicService;
