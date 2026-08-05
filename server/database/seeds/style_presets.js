// server/database/seeds/style_presets.js

/** 核心 8 风格（唯一数据源，迁移与 seed 共用） */
const seedData = [
  {
    code: 'jp_monochrome',
    name: '日漫黑白',
    category: '日系',
    style_prompt:
      '日系黑白漫画风格，精细墨线线稿，网点纸与阴影排线，高对比黑白画面，分镜感强，不要彩色，不要照片写实',
    description: '经典日本漫画风格，适合少年向、热血题材',
    sort_order: 1,
    cover_image: '/images/styles/jp_monochrome.png',
  },
  {
    code: 'jp_color',
    name: '日漫全彩',
    category: '日系',
    style_prompt:
      '日系全彩漫画风格，清晰线稿，赛璐璐或精细平涂上色，鲜明色彩与动漫光影，画面干净精致，不要写实照片质感',
    description: '全彩日漫风格，色彩丰富，画面精美',
    sort_order: 2,
    cover_image: '/images/styles/jp_color.png',
  },
  {
    code: 'jp_shoujo',
    name: '少女漫',
    category: '日系',
    style_prompt:
      '少女漫画风格，柔和细腻线条，大眼睛精致五官，浪漫氛围，花朵星光与速度线点缀，柔和配色，唯美情绪',
    description: '浪漫唯美的少女向风格',
    sort_order: 3,
    cover_image: '/images/styles/jp_shoujo.png',
  },
  {
    code: 'jp_chibi',
    name: 'Q版萌系',
    category: '日系',
    style_prompt:
      'Q版萌系漫画风格，二头身或三头身比例，圆润可爱造型，简洁粗线，明亮饱和色彩，表情夸张，轻松欢快',
    description: '超可爱的Q版角色风格',
    sort_order: 4,
    cover_image: '/images/styles/jp_chibi.png',
  },
  {
    code: 'cn_ink',
    name: '水墨国风',
    category: '国风',
    style_prompt:
      '中国水墨国风漫画，墨色渲染与留白意境，书法感笔触，淡彩或纯水墨，传统山水气韵，适合武侠古风，避免西式厚涂',
    description: '传统水墨画意境，适合武侠、古风题材',
    sort_order: 10,
    cover_image: '/images/styles/cn_ink.png',
  },
  {
    code: 'cn_xianxia',
    name: '仙侠古风',
    category: '国风',
    style_prompt:
      '仙侠古风漫画风格，飘逸衣袂与灵力光效，云雾山岚，清丽或绚烂仙气配色，东方奇幻氛围，精致服饰纹样',
    description: '仙侠修真题材专属风格',
    sort_order: 11,
    cover_image: '/images/styles/cn_xianxia.png',
  },
  {
    code: 'us_hero',
    name: '美漫英雄',
    category: '美系',
    style_prompt:
      '美式超级英雄漫画风格，粗犷有力线稿，强烈明暗对比，动态夸张构图，浓烈色彩，半调网点可选，漫画书质感',
    description: '美式超级英雄漫画风格',
    sort_order: 20,
    cover_image: '/images/styles/us_hero.png',
  },
  {
    code: 'realistic_cyber',
    name: '赛博朋克',
    category: '特色',
    style_prompt:
      '赛博朋克漫画风格，霓虹灯光与未来都市，潮湿反光与全息招牌，冷暖强对比，科技与颓废并存，电影分镜感',
    description: '未来科幻赛博朋克风格',
    sort_order: 30,
    cover_image: '/images/styles/realistic_cyber.png',
  },
];

const CORE_CODES = seedData.map(item => item.code);

/**
 * 幂等：确保仅有核心 8 风格，并更新文案
 * @param {import('better-sqlite3').Database} db
 */
function ensureCoreStylePresets(db) {
  const hasStylePresetId = db
    .prepare('PRAGMA table_info(comics)')
    .all()
    .some(column => column.name === 'style_preset_id');

  const upsert = db.prepare(`
    INSERT INTO style_presets (code, name, category, style_prompt, description, cover_image, sort_order, is_enabled)
    VALUES (@code, @name, @category, @style_prompt, @description, @cover_image, @sort_order, 1)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      style_prompt = excluded.style_prompt,
      description = excluded.description,
      cover_image = COALESCE(style_presets.cover_image, excluded.cover_image),
      sort_order = excluded.sort_order,
      is_enabled = 1,
      updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction(() => {
    for (const item of seedData) {
      upsert.run({
        code: item.code,
        name: item.name,
        category: item.category,
        style_prompt: item.style_prompt,
        description: item.description,
        cover_image: item.cover_image,
        sort_order: item.sort_order,
      });
    }

    const placeholders = CORE_CODES.map(() => '?').join(', ');

    if (hasStylePresetId) {
      db.prepare(
        `UPDATE comics SET style_preset_id = NULL
         WHERE style_preset_id IN (
           SELECT id FROM style_presets WHERE code NOT IN (${placeholders})
         )`
      ).run(...CORE_CODES);
    }

    const deleteResult = db
      .prepare(`DELETE FROM style_presets WHERE code NOT IN (${placeholders})`)
      .run(...CORE_CODES);

    return deleteResult.changes;
  });

  const deletedCount = transaction();
  const remaining = db.prepare('SELECT COUNT(*) as cnt FROM style_presets').get().cnt;
  console.log(
    `[风格预设] ensureCore: 保留 ${remaining} 条，删除非核心 ${deletedCount} 条`
  );
  return { remaining, deletedCount };
}

/**
 * 仅空库插入 8 核心预设。已有数据时不做收敛/删除（收敛由 maintain style-presets-v2 人工执行）
 * @param {import('better-sqlite3').Database} db
 */
function seedStylePresets(db) {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM style_presets').get();

  if (count.cnt > 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO style_presets (code, name, category, style_prompt, description, cover_image, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const item of seedData) {
      insert.run(
        item.code,
        item.name,
        item.category,
        item.style_prompt,
        item.description,
        item.cover_image,
        item.sort_order
      );
    }
  });

  transaction();
  console.log(`[数据库初始化] 空库已插入 ${seedData.length} 条风格预设数据`);
}

module.exports = {
  seedStylePresets,
  ensureCoreStylePresets,
  seedData,
  CORE_CODES,
};
