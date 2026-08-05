'use strict';

/**
 * 风格预设示例图提示词：无角色、统一场景骨架，只展示画风
 * @param {string} stylePrompt
 * @returns {string}
 */
function buildStyleCoverPrompt(stylePrompt) {
  return [
    '生成一张漫画画风示例图，用于展示视觉风格，不是故事分镜。',
    '构图要求：横构图或正方形，展示一座城市街道转角与远景建筑、天空、地面材质细节；',
    '可有车辆、路灯、招牌轮廓等环境元素，但画面中不要出现任何人物、人脸、角色、拟人生物。',
    '不要对白气泡、不要文字水印、不要分镜格子、不要风格名称文字。',
    '重点表现线稿质感、上色方式、光影与整体氛围。',
    `必须严格遵循以下画风：${stylePrompt}`,
  ].join('');
}

module.exports = { buildStyleCoverPrompt };
