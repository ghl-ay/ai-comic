// server/app/service/object-storage.js
const Service = require('egg').Service;
const fs = require('fs');

class ObjectStorageService extends Service {
  async uploadReferenceImage(filePath) {
    const buffer = fs.readFileSync(filePath);
    const filename = `characters/${filePath.split('/').pop()}`;
    return await this.ctx.service.storage.upload(buffer, filename);
  }
}

module.exports = ObjectStorageService;
