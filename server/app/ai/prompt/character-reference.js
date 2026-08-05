// server/app/ai/prompt/character-reference.js
'use strict';

/**
 * 构建角色参考图提示词。
 * 固定版式/背景/姿态，保证每次生成的参考图视觉规格一致，便于后续出图保持角色一致性。
 */
function buildCharacterReferencePrompt({ name, description, appearance }) {
  return `Character design turnaround sheet / 角色设定三视图参考图.

【固定版式 — 所有生成必须严格遵守，不得改变】
- 一张图内横向并排 3 个全身视图，从左到右顺序固定：正面 Front → 右侧面 Side → 背面 Back
- 同一角色、同一身高比例、脚底对齐在同一水平线上，人物间距均匀
- 纯白背景 pure white background (#FFFFFF)，无渐变、无阴影地面、无网格、无场景、无道具
- 中性站姿：双脚并立站稳，双手自然垂于身侧（非 T-pose、非交叉手臂、非动态姿势）
- 正面：直视镜头，身体完全朝前；侧面：精确 90° 侧脸与侧身；背面：完全背对镜头
- 全身完整入镜，头顶到脚底留出少量边距，不得裁切肢体
- 三视图之间发型、五官、体型、服装、配色、配饰必须完全一致
- 干净线稿 + 均匀平涂上色，柔和正面光，无戏剧性光影
- 无文字、无标签、无水印、无边框、无分镜框、无表情格子、无额外小图

【角色信息】
角色名称：${name}
角色描述：${description || '无'}
外观描述：${appearance}

【输出要求】
仅输出上述标准三视图角色设定图；除角色外观按描述绘制外，版式、背景色、姿态、构图规格保持统一。`;
}

module.exports = {
  buildCharacterReferencePrompt,
};
