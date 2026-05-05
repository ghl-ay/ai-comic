// server/app/providers/base.js
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class BaseImageProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * 生成图片 - 必须由子类实现
   * @param {Object} params - 生成参数
   * @returns {Promise<{imageBuffer: Buffer}>}
   */
  async generateImage(params) {
    throw new Error('必须实现 generateImage 方法');
  }

  /**
   * 带参考图生成图片 - 可选重写
   * @param {Object} params - 生成参数
   * @returns {Promise<{imageBuffer: Buffer}>}
   */
  async generateImageWithReference(params) {
    return this.generateImage(params);
  }

  /**
   * 下载图片
   */
  static async downloadImage(url) {
    const protocol = url.startsWith('https') ? https : http;

    return new Promise((resolve, reject) => {
      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          BaseImageProvider.downloadImage(response.headers.location)
            .then(resolve)
            .catch(reject);
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * 构建漫画页面提示词
   */
  static buildComicPagePrompt(params) {
    const { stylePrompt, layoutType, script, characterReferences, previousChapterImage } = params;
    const charactersById = new Map(characterReferences.map(character => [character.id, character]));

    const panelDescriptions = script.panels.map((panel, index) => {
      const panelCharacters = Array.isArray(panel.characters) ? panel.characters : [];
      const characterNames = panelCharacters
        .map(id => charactersById.get(id)?.name || `Character ${id}`)
        .join(', ') || 'none specified';

      return [
        `Panel ${index + 1}:`,
        `Scene: ${panel.scene || ''}`,
        `Dialogue / speech bubbles: ${panel.dialogue || '(no dialogue)'}`,
        `Characters in panel: ${characterNames}`,
      ].join('\n');
    }).join('\n\n');

    const characterDescriptions = characterReferences.length > 0
      ? characterReferences.map(character => {
        return [
          `ID ${character.id} - ${character.name}`,
          `Description: ${character.description || 'Not provided'}`,
          `Appearance: ${character.appearance || 'Not provided'}`,
          `Reference image: ${character.imageUrl ? 'provided as input image' : 'not provided'}`,
        ].join('\n');
      }).join('\n\n')
      : 'No character library entries were provided.';

    let prompt = `Create a single ${layoutType}-panel comic page in this visual style: ${stylePrompt}.

Panel layout:
${layoutType} distinct panels arranged in a clean comic grid with clear panel borders.

Character library:
${characterDescriptions}

Panel script:
${panelDescriptions}

Requirements:
- Match each panel scene, action, and character list exactly.
- Use the character library as the source of truth for character design, clothing, body type, hairstyle, and visual personality.
- If reference images are provided, preserve those designs across every panel.
- Readable Chinese speech bubbles for every non-empty dialogue line.
- Do not omit dialogue. Keep speech bubble text concise, legible, and placed inside the correct panel.
- Preserve the requested visual style and do not override it with another color mode.`;

    if (previousChapterImage) {
      prompt += '\n- Maintain visual continuity with the previous chapter reference image.';
    }

    return prompt;
  }
}

module.exports = BaseImageProvider;
