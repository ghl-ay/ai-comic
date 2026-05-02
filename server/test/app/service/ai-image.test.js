'use strict';

const assert = require('assert');
const AiImageService = require('../../../app/service/ai-image');

describe('test/app/service/ai-image.test.js', () => {
  describe('default image model', () => {
    it('defaults to gpt-image-2', () => {
      assert.strictEqual(AiImageService.DEFAULT_IMAGE_MODEL, 'gpt-image-2');
    });
  });

  describe('buildComicPagePrompt()', () => {
    it('includes dialogue and character library details', () => {
      const prompt = AiImageService.buildComicPagePrompt({
        stylePrompt: '彩色卡通风格',
        layoutType: 2,
        script: {
          panels: [
            {
              scene: '便利店深夜，荧光灯惨白。',
              dialogue: '林放：这关东煮怎么有点酸？',
              characters: [1],
            },
            {
              scene: '教室里，学长围住林放。',
              dialogue: '学长A：保护费呢？',
              characters: [1, 2],
            },
          ],
        },
        characterReferences: [
          {
            id: 1,
            name: '放屁超人',
            description: '胆小但善良的高中生',
            appearance: '短发，校服，表情夸张',
            imageUrl: '/images/characters/character_1.png',
          },
          {
            id: 2,
            name: '学长A',
            description: '',
            appearance: '平头，高个子，校服外套敞开',
          },
        ],
        previousChapterImage: 'page_previous.png',
      });

      assert(prompt.includes('彩色卡通风格'));
      assert(prompt.includes('Dialogue / speech bubbles: 林放：这关东煮怎么有点酸？'));
      assert(prompt.includes('Dialogue / speech bubbles: 学长A：保护费呢？'));
      assert(prompt.includes('ID 1 - 放屁超人'));
      assert(prompt.includes('Description: 胆小但善良的高中生'));
      assert(prompt.includes('Appearance: 短发，校服，表情夸张'));
      assert(prompt.includes('Reference image: provided as input image'));
      assert(prompt.includes('Readable Chinese speech bubbles'));
      assert(prompt.includes('Do not omit dialogue'));
      assert(!prompt.includes('No text or speech bubbles'));
      assert(!prompt.includes('black and white manga style'));
    });
  });

  describe('buildComicPageRequest()', () => {
    it('uses gpt-image-2 image edit requests with reference images', () => {
      const request = AiImageService.buildComicPageRequest({
        model: 'gpt-image-2',
        prompt: 'prompt',
        imageInputs: [ 'ref-1', 'ref-2' ],
      });

      assert.strictEqual(request.method, 'edit');
      assert.deepStrictEqual(request.body, {
        model: 'gpt-image-2',
        prompt: 'prompt',
        image: [ 'ref-1', 'ref-2' ],
        n: 1,
        size: '1024x1024',
      });
    });

    it('uses image generation when no reference images exist', () => {
      const request = AiImageService.buildComicPageRequest({
        model: 'gpt-image-2',
        prompt: 'prompt',
        imageInputs: [],
      });

      assert.strictEqual(request.method, 'generate');
      assert.deepStrictEqual(request.body, {
        model: 'gpt-image-2',
        prompt: 'prompt',
        n: 1,
        size: '1024x1024',
      });
    });

    it('keeps URL response format for non gpt-image models', () => {
      const request = AiImageService.buildComicPageRequest({
        model: 'dall-e-3',
        prompt: 'prompt',
        imageInputs: [],
      });

      assert.strictEqual(request.body.response_format, 'url');
    });
  });

  describe('extractImageBuffer()', () => {
    it('decodes base64 image responses', () => {
      const buffer = AiImageService.extractImageBuffer({
        data: [
          {
            b64_json: Buffer.from('image-bytes').toString('base64'),
          },
        ],
      });

      assert.strictEqual(buffer.toString(), 'image-bytes');
    });
  });

  describe('executeComicPageRequest()', () => {
    it('falls back to image generation when reference-image edit endpoint is missing', async () => {
      const calls = [];
      const notFoundError = new Error('404 page not found');
      notFoundError.status = 404;

      const client = {
        images: {
          edit: async body => {
            calls.push([ 'edit', body ]);
            throw notFoundError;
          },
          generate: async body => {
            calls.push([ 'generate', body ]);
            return {
              data: [
                {
                  b64_json: Buffer.from('generated').toString('base64'),
                },
              ],
            };
          },
        },
      };

      const response = await AiImageService.executeComicPageRequest(client, {
        method: 'edit',
        body: {
          model: 'gpt-image-2',
          prompt: 'keep character appearance',
          image: [ 'reference-stream' ],
          n: 1,
          size: '1024x1024',
        },
      });

      assert.strictEqual(response.data[0].b64_json, Buffer.from('generated').toString('base64'));
      assert.deepStrictEqual(calls, [
        [
          'edit',
          {
            model: 'gpt-image-2',
            prompt: 'keep character appearance',
            image: [ 'reference-stream' ],
            n: 1,
            size: '1024x1024',
          },
        ],
        [
          'generate',
          {
            model: 'gpt-image-2',
            prompt: 'keep character appearance',
            n: 1,
            size: '1024x1024',
          },
        ],
      ]);
    });
  });
});
