'use strict';

const assert = require('assert');
const AiTextService = require('../../../app/service/ai-text');

describe('test/app/service/ai-text.test.js', () => {
  describe('parseScriptContent()', () => {
    it('parses JSON after model thinking text', () => {
      const content = `<think>用户要生成漫画脚本，我先构思分镜。</think>
{
  "title": "雨夜重逢",
  "panels": [
    {
      "number": 1,
      "scene": "雨夜的街口，霓虹映在积水里。",
      "dialogue": "林夏：你终于来了。",
      "characters": [1]
    }
  ]
}`;

      const script = AiTextService.parseScriptContent(content, 2);

      assert.deepStrictEqual(script, {
        title: '雨夜重逢',
        panels: [
          {
            number: 1,
            scene: '雨夜的街口，霓虹映在积水里。',
            dialogue: '林夏：你终于来了。',
            characters: [1],
          },
          {
            number: 2,
            scene: '',
            dialogue: '',
            characters: [],
          },
        ],
      });
    });
  });
});
