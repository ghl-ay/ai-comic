'use strict';

const assert = require('assert');
const OpenAIImageProtocol = require('../../../app/ai/image/openai');
const GrokImageProtocol = require('../../../app/ai/image/grok');
const { createImageProtocol, getSupportedImageProtocols } = require('../../../app/ai/registry');
const { buildComicPagePrompt } = require('../../../app/ai/prompt/comic-page');
const { referencesToUrlList } = require('../../../app/ai/utils/reference');

describe('test/app/service/ai-image.test.js', () => {
  describe('buildComicPagePrompt()', () => {
    it('includes character and panel info', () => {
      const prompt = buildComicPagePrompt({
        comicTitle: '测试漫画',
        stylePrompt: '日系黑白',
        layoutType: 2,
        chapterPrompt: '主角相遇',
        script: {
          panels: [
            { number: 1, scene: '街道', dialogue: '你好', characters: [1] },
          ],
        },
        characterReferences: [
          { id: 1, name: '小明', appearance: '黑发', imageUrl: '/images/characters/a.png' },
        ],
        previousChapter: null,
      });

      assert(prompt.includes('测试漫画'));
      assert(prompt.includes('小明'));
      assert(prompt.includes('街道'));
    });
  });

  describe('OpenAIImageProtocol', () => {
    it('detects gpt-image models', () => {
      const protocol = new OpenAIImageProtocol({
        apiKey: 'test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-image-2',
      });
      assert.strictEqual(protocol.isGptImageModel('gpt-image-2'), true);
      assert.strictEqual(protocol.isGptImageModel('dall-e-3'), false);
    });

    it('extracts b64_json response', () => {
      const protocol = new OpenAIImageProtocol({
        apiKey: 'test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-image-2',
      });
      const result = protocol.extractImageResponse({
        data: [{ b64_json: Buffer.from('hello').toString('base64') }],
      });
      assert(Buffer.isBuffer(result.imageBuffer));
      assert.strictEqual(result.imageBuffer.toString(), 'hello');
    });

    it('extracts url response', () => {
      const protocol = new OpenAIImageProtocol({
        apiKey: 'test',
        baseUrl: 'https://api.openai.com/v1',
        model: 'dall-e-3',
      });
      const result = protocol.extractImageResponse({
        data: [{ url: 'https://example.com/a.png' }],
      });
      assert.strictEqual(result.imageUrl, 'https://example.com/a.png');
    });
  });

  describe('GrokImageProtocol', () => {
    it('builds urls with and without /v1 suffix', () => {
      const withV1 = new GrokImageProtocol({
        apiKey: 'k',
        baseUrl: 'https://sub2api.example.com/v1',
        model: 'grok-imagine-image',
      });
      assert.strictEqual(
        withV1.buildUrl('/v1/images/generations'),
        'https://sub2api.example.com/v1/images/generations'
      );

      const withoutV1 = new GrokImageProtocol({
        apiKey: 'k',
        baseUrl: 'https://sub2api.example.com',
        model: 'grok-imagine-image',
      });
      assert.strictEqual(
        withoutV1.buildUrl('/images/generations'),
        'https://sub2api.example.com/v1/images/generations'
      );
    });

    it('extracts openai-style result', () => {
      const protocol = new GrokImageProtocol({
        apiKey: 'k',
        baseUrl: 'https://sub2api.example.com',
        model: 'grok-imagine-image',
      });
      const result = protocol.extractImageResult({
        data: [{ url: 'https://cdn.example.com/x.png' }],
      });
      assert.strictEqual(result.imageUrl, 'https://cdn.example.com/x.png');
    });
  });

  describe('registry', () => {
    it('creates openai and grok image protocols', () => {
      const openai = createImageProtocol('openai', {
        apiKey: 'k',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-image-2',
      });
      assert(openai instanceof OpenAIImageProtocol);

      const grok = createImageProtocol('grok', {
        apiKey: 'k',
        baseUrl: 'https://sub2api.example.com',
        model: 'grok-imagine-image',
      });
      assert(grok instanceof GrokImageProtocol);
    });

    it('rejects unknown protocol', () => {
      assert.throws(
        () => createImageProtocol('grsai', { apiKey: 'k', baseUrl: 'x', model: 'y' }),
        /不支持的图片协议/
      );
    });

    it('lists supported image protocols without grsai', () => {
      const formats = getSupportedImageProtocols();
      assert.deepStrictEqual(formats.sort(), ['grok', 'openai']);
    });
  });

  describe('referencesToUrlList', () => {
    it('converts base64 references', () => {
      const list = referencesToUrlList([
        { type: 'base64', data: 'abc', mimeType: 'image/png' },
      ]);
      assert.strictEqual(list[0], 'data:image/png;base64,abc');
    });
  });
});
