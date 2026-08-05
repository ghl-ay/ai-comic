-- server/database/init.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  is_admin INTEGER DEFAULT 0,
  oidc_sub TEXT,
  oidc_issuer TEXT,
  display_name TEXT,
  avatar_url TEXT,
  auth_provider TEXT DEFAULT 'local',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 角色表
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  appearance TEXT,
  reference_image VARCHAR(255),
  reference_prompt TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 漫画表
CREATE TABLE IF NOT EXISTS comics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(20) DEFAULT 'normal',
  style_prompt TEXT,
  cover_image VARCHAR(255),
  status VARCHAR(20) DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 章节表
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comic_id INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(200),
  layout_type INTEGER DEFAULT 4,
  chapter_prompt TEXT,
  character_ids TEXT,
  script_content TEXT,
  page_image VARCHAR(255),
  status VARCHAR(20) DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
);

-- AI 提供商配置表（type=text|image 为模型提供商；type=image_storage 为历史存储配置兼容）
CREATE TABLE IF NOT EXISTS ai_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type VARCHAR(20) NOT NULL,
  name TEXT,
  protocol TEXT,
  provider VARCHAR(50) DEFAULT '',
  api_key TEXT NOT NULL,
  base_url TEXT DEFAULT '',
  model TEXT DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  extra TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 通用配置表
CREATE TABLE IF NOT EXISTS configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(50) NOT NULL,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, key)
);

-- 小说表
CREATE TABLE IF NOT EXISTS novels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  comic_id INTEGER,
  title TEXT,
  content TEXT NOT NULL,
  word_count INTEGER,
  status TEXT DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE SET NULL
);

-- 风格预设表
CREATE TABLE IF NOT EXISTS style_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  style_prompt TEXT NOT NULL,
  description TEXT,
  cover_image VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oidc
  ON users(oidc_issuer, oidc_sub)
  WHERE oidc_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_comics_user ON comics(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_comic ON chapters(comic_id);
CREATE INDEX IF NOT EXISTS idx_ai_configs_user ON ai_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_user ON novels(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_comic ON novels(comic_id);
CREATE INDEX IF NOT EXISTS idx_style_presets_category ON style_presets(category);
CREATE INDEX IF NOT EXISTS idx_style_presets_enabled ON style_presets(is_enabled);
