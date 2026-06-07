// server/database/seeds/style_presets.js
const seedData = [
  // 日系漫画
  {
    code: 'jp_monochrome',
    name: '日漫黑白',
    category: '日系漫画',
    style_prompt: '日系黑白漫画风格，精细线稿，网点纸阴影，高对比度黑白画面',
    description: '经典日本漫画风格，适合少年向、热血题材',
    sort_order: 1
  },
  {
    code: 'jp_color',
    name: '日漫彩漫',
    category: '日系漫画',
    style_prompt: '日系彩漫风格，鲜艳色彩，精细上色，动漫质感',
    description: '全彩日漫风格，色彩丰富，画面精美',
    sort_order: 2
  },
  {
    code: 'jp_shoujo',
    name: '少女漫',
    category: '日系漫画',
    style_prompt: '少女漫画风格，柔和线条，大眼睛角色，浪漫氛围，花朵与星光装饰',
    description: '浪漫唯美的少女向风格',
    sort_order: 3
  },
  {
    code: 'jp_chibi',
    name: 'Q版萌系',
    category: '日系漫画',
    style_prompt: 'Q版萌系风格，二头身比例，圆润可爱，明亮色彩',
    description: '超可爱的Q版角色风格',
    sort_order: 4
  },
  // 国风
  {
    code: 'cn_ink',
    name: '水墨国风',
    category: '国风',
    style_prompt: '中国水墨画风格，留白意境，墨色渲染，传统笔触',
    description: '传统水墨画意境，适合武侠、古风题材',
    sort_order: 10
  },
  {
    code: 'cn_painted',
    name: '彩绘国风',
    category: '国风',
    style_prompt: '中国彩绘风格，工笔重彩，传统纹饰，浓烈色彩',
    description: '工笔重彩的中国传统绘画风格',
    sort_order: 11
  },
  {
    code: 'cn_xianxia',
    name: '仙侠风',
    category: '国风',
    style_prompt: '仙侠风格，飘逸仙气，灵力光效，云雾缭绕',
    description: '仙侠修真题材专属风格',
    sort_order: 12
  },
  // 美系漫画
  {
    code: 'us_hero',
    name: '美漫英雄',
    category: '美系漫画',
    style_prompt: '美漫超级英雄风格，粗犷线稿，强光影对比，动态构图',
    description: '美式超级英雄漫画风格',
    sort_order: 20
  },
  {
    code: 'us_indie',
    name: '美漫独立',
    category: '美系漫画',
    style_prompt: '美式独立漫画风格，简约线条，实验性构图，个性化表达',
    description: '独立漫画风格，适合文艺、实验性作品',
    sort_order: 21
  },
  // 卡通/绘本
  {
    code: 'cartoon_us',
    name: '美式卡通',
    category: '卡通/绘本',
    style_prompt: '美式卡通风格，夸张表情，明亮色彩，圆润造型',
    description: '经典美式动画卡通风格',
    sort_order: 30
  },
  {
    code: 'cartoon_picture',
    name: '绘本插画',
    category: '卡通/绘本',
    style_prompt: '绘本插画风格，温暖柔和，手绘质感，故事感画面',
    description: '适合儿童绘本、温馨故事',
    sort_order: 31
  },
  {
    code: 'cartoon_pixel',
    name: '像素风',
    category: '卡通/绘本',
    style_prompt: '像素艺术风格，8-bit/16-bit 复古像素，块状色块',
    description: '复古像素游戏风格',
    sort_order: 32
  },
  // 写实/照片
  {
    code: 'realistic',
    name: '写实漫画',
    category: '写实/照片',
    style_prompt: '写实漫画风格，接近真实比例，精细光影，电影级画面',
    description: '高度写实的漫画风格',
    sort_order: 40
  },
  {
    code: 'realistic_cyber',
    name: '赛博朋克',
    category: '写实/照片',
    style_prompt: '赛博朋克风格，霓虹灯光，未来都市，科技感与颓废并存',
    description: '未来科幻赛博朋克风格',
    sort_order: 41
  },
  // 特色风格
  {
    code: 'special_gothic',
    name: '暗黑哥特',
    category: '特色风格',
    style_prompt: '暗黑哥特风格，阴郁色调，尖锐造型，神秘恐怖氛围',
    description: '哥特暗黑美学，适合恐怖、神秘题材',
    sort_order: 50
  },
  {
    code: 'special_steam',
    name: '蒸汽朋克',
    category: '特色风格',
    style_prompt: '蒸汽朋克风格，齿轮机械，维多利亚美学，铜铁质感',
    description: '蒸汽朋克复古科技风格',
    sort_order: 51
  },
  {
    code: 'special_horror',
    name: '恐怖悬疑',
    category: '特色风格',
    style_prompt: '恐怖悬疑漫画风格，压抑氛围，高对比明暗，紧张构图',
    description: '悬疑惊悚题材风格',
    sort_order: 52
  },
  {
    code: 'special_minimal',
    name: '极简线稿',
    category: '特色风格',
    style_prompt: '极简线稿风格，简洁线条，大量留白，优雅干净',
    description: '极简风格，注重线条美感',
    sort_order: 53
  },
  {
    code: 'special_watercolor',
    name: '水彩风',
    category: '特色风格',
    style_prompt: '水彩画风格，晕染边缘，透明色彩，艺术感笔触',
    description: '水彩手绘质感风格',
    sort_order: 54
  }
];

function seedStylePresets(db) {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM style_presets').get();
  
  if (count.cnt === 0) {
    const insert = db.prepare(`
      INSERT INTO style_presets (code, name, category, style_prompt, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = db.transaction(() => {
      for (const item of seedData) {
        insert.run(
          item.code,
          item.name,
          item.category,
          item.style_prompt,
          item.description,
          item.sort_order
        );
      }
    });
    
    transaction();
    console.log(`[数据库初始化] 已插入 ${seedData.length} 条风格预设数据`);
  }
}

module.exports = { seedStylePresets, seedData };
