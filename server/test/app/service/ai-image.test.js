'use strict';

const assert = require('assert');
const BaseImageProvider = require('../../../app/providers/base');
const OpenAIImageProvider = require('../../../app/providers/openai');
const GrsaiImageProvider = require('../../../app/providers/grsai');
const AiImageService = require('../../../app/service/ai-image');

describe('test/app/service/ai-image.test.js', () => {
  describe('default image model', () => {
    it('defaults to gpt-image-2', () => {
      assert.strictEqual(AiImageService.DEFAULT_IMAGE_MODEL, 'gpt-image-2');
    });

    it('waits up to 10 minutes for Grsai draw results by default', () => {
      assert.strictEqual(
        GrsaiImageProvider.DEFAULT_POLL_INTERVAL_MS * GrsaiImageProvider.DEFAULT_MAX_POLL_ATTEMPTS,
        10 * 60 * 1000
      );
    });
  });

  describe('buildComicPagePrompt()', () => {
    it('includes dialogue and character library details', () => {
      const prompt = BaseImageProvider.buildComicPagePrompt({
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

  describe('OpenAI Provider', () => {
    it('detects gpt-image models', () => {
      const provider = new OpenAIImageProvider({
        apiKey: 'test',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-image-2',
      });

      assert.strictEqual(provider.isGptImageModel('gpt-image-2'), true);
      assert.strictEqual(provider.isGptImageModel('gpt-image-1'), true);
      assert.strictEqual(provider.isGptImageModel('dall-e-3'), false);
    });

    it('extracts image response with base64', () => {
      const provider = new OpenAIImageProvider({
        apiKey: 'test',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-image-2',
      });

      const result = provider.extractImageResponse({
        data: [
          {
            b64_json: Buffer.from('image-bytes').toString('base64'),
          },
        ],
      });

      assert.strictEqual(result.imageBuffer.toString(), 'image-bytes');
    });

    it('extracts image response with URL', () => {
      const provider = new OpenAIImageProvider({
        apiKey: 'test',
        baseUrl: 'https://api.openai.com',
        model: 'dall-e-3',
      });

      const result = provider.extractImageResponse({
        data: [
          {
            url: 'https://example.com/image.png',
          },
        ],
      });

      assert.strictEqual(result.imageUrl, 'https://example.com/image.png');
    });
  });

  describe('Grsai Provider', () => {
    it('builds Grsai draw API URLs from either host or v1 base URL', () => {
      const provider = new GrsaiImageProvider({
        apiKey: 'test',
        baseUrl: 'https://grsai.dakka.com.cn',
        model: 'gpt-image-2',
      });

      assert.strictEqual(
        provider.buildGrsaiApiUrl('https://grsai.dakka.com.cn', 'completions'),
        'https://grsai.dakka.com.cn/v1/draw/completions'
      );
      assert.strictEqual(
        provider.buildGrsaiApiUrl('https://grsai.dakka.com.cn/v1', 'result'),
        'https://grsai.dakka.com.cn/v1/draw/result'
      );
    });

    it('converts Grsai result to image response', () => {
      const provider = new GrsaiImageProvider({
        apiKey: 'test',
        baseUrl: 'https://grsai.dakka.com.cn',
        model: 'gpt-image-2',
      });

      const result = provider.convertGrsaiResultToImageResponse({
        url: 'https://example.com/generated.png',
        status: 'succeeded',
      });

      assert.deepStrictEqual(result, {
        imageUrl: 'https://example.com/generated.png',
      });
    });

    it('extracts Grsai result payload correctly', () => {
      const provider = new GrsaiImageProvider({
        apiKey: 'test',
        baseUrl: 'https://grsai.dakka.com.cn',
        model: 'gpt-image-2',
      });

      // Nested data format
      const nestedResult = provider.extractGrsaiResultPayload({
        code: 0,
        data: {
          id: 'task-1',
          status: 'succeeded',
          url: 'https://example.com/image.png',
        },
      });
      assert.strictEqual(nestedResult.status, 'succeeded');

      // Flat data format
      const flatResult = provider.extractGrsaiResultPayload({
        code: 0,
        status: 'succeeded',
        url: 'https://example.com/image.png',
      });
      assert.strictEqual(flatResult.status, 'succeeded');
    });
  });

  describe('Provider factory', () => {
    it('creates OpenAI provider', () => {
      const { createImageProvider } = require('../../../app/providers');
      const provider = createImageProvider('openai', {
        apiKey: 'test',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-image-2',
      });

      assert(provider instanceof OpenAIImageProvider);
    });

    it('creates Grsai provider', () => {
      const { createImageProvider } = require('../../../app/providers');
      const provider = createImageProvider('grsai', {
        apiKey: 'test',
        baseUrl: 'https://grsai.dakka.com.cn',
        model: 'gpt-image-2',
      });

      assert(provider instanceof GrsaiImageProvider);
    });

    it('throws for unsupported format', () => {
      const { createImageProvider } = require('../../../app/providers');

      assert.throws(
        () => createImageProvider('unknown', {}),
        /不支持的 API 格式: unknown/
      );
    });

    it('returns supported formats', () => {
      const { getSupportedFormats } = require('../../../app/providers');
      const formats = getSupportedFormats();

      assert.deepStrictEqual(formats, ['openai', 'grsai']);
    });
  });
});
