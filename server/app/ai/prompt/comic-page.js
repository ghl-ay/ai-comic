// server/app/ai/prompt/comic-page.js
'use strict';

/**
 * 构建漫画页面提示词（从旧 BaseImageProvider 迁出）
 */
function buildComicPagePrompt(params) {
  const {
    comicTitle,
    stylePrompt,
    layoutType,
    chapterPrompt,
    script,
    characterReferences,
    previousChapter,
  } = params;

  let imageIndex = 1;
  const imageDescriptions = [];
  for (const character of characterReferences) {
    if (character.imageUrl) {
      imageDescriptions.push(`第${imageIndex}张图片是「${character.name}」的角色参考图`);
      imageIndex++;
    }
  }
  if (previousChapter?.image) {
    imageDescriptions.push(`第${imageIndex}张图片是上一章的漫画参考图`);
    imageIndex++;
  }

  const characterDescriptions = characterReferences.length > 0
    ? characterReferences.map((character, index) => {
      const lines = [`【${character.name}】`];
      if (character.description) lines.push(`角色描述：${character.description}`);
      if (character.appearance) lines.push(`外观特征：${character.appearance}`);
      if (character.imageUrl) lines.push(`参考图：第${index + 1}张图片`);
      return lines.join('\n');
    }).join('\n\n')
    : '未提供角色信息。';

  const panelDescriptions = (script.panels || []).map((panel, index) => {
    const panelCharacters = Array.isArray(panel.characters) ? panel.characters : [];
    const characterNames = panelCharacters
      .map(id => {
        const character = characterReferences.find(item => item.id === id);
        return character ? character.name : `角色${id}`;
      })
      .join('、') || '无';

    const lines = [`第${index + 1}格`];
    if (panel.scene) lines.push(`场景：${panel.scene}`);
    if (panel.dialogue) lines.push(`对白：${panel.dialogue}`);
    lines.push(`出场角色：${characterNames}`);
    return lines.join('\n');
  }).join('\n\n');

  let prompt = `【漫画信息】
漫画标题：${comicTitle}
画面风格：${stylePrompt}

【角色信息】
${characterDescriptions}

${imageDescriptions.length > 0 ? `【图片说明】\n${imageDescriptions.join('\n')}\n\n` : ''}【本章节信息】
章节提示词：${chapterPrompt || '未提供'}
分镜数量：${layoutType}格

分镜脚本：
${panelDescriptions}`;

  if (previousChapter) {
    prompt += `\n\n【上一章参考】`;
    if (previousChapter.chapterPrompt) {
      prompt += `\n上一章提示词：${previousChapter.chapterPrompt}`;
    }
    if (previousChapter.script?.panels) {
      prompt += `\n上一章分镜脚本：`;
      for (const panel of previousChapter.script.panels) {
        prompt += `\n第${panel.number}格：`;
        if (panel.scene) prompt += `场景：${panel.scene}；`;
        if (panel.dialogue) prompt += `对白：${panel.dialogue}`;
      }
    }
    if (previousChapter.image) {
      prompt += `\n上一章参考图：第${imageIndex}张图片`;
    }
  }

  prompt += `\n\n【绘制要求】
- 严格按照分镜脚本的场景、动作和角色列表进行绘制
- 以角色信息作为角色设计、服装、体型、发型的依据
- 如果提供了角色参考图，保持角色外观一致
- 如果提供了上一章参考图，保持视觉风格和剧情连贯性
- 对白使用中文气泡文字，清晰可读，不要省略
- 保持要求的视觉风格，不要切换为其他色彩模式`;

  return prompt;
}

module.exports = { buildComicPagePrompt };
