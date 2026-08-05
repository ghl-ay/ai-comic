'use strict';

/**
 * 维护任务注册表
 *
 * 每个任务模块导出：
 * - name: 接口简写名
 * - description: 说明
 * - destructive?: boolean
 * - analyze(db): step=1 分析结果
 * - execute(db): step=2 真正执行
 */

const aiProvidersV2 = require('./ai-providers-v2');
const stylePresetsV2 = require('./style-presets-v2');
const configsStorage = require('./configs-storage');

/** @type {Record<string, { name: string, description: string, destructive?: boolean, fromCommit?: string, analyze: Function, execute: Function }>} */
const TASKS = {
  [configsStorage.name]: configsStorage,
  [aiProvidersV2.name]: aiProvidersV2,
  [stylePresetsV2.name]: stylePresetsV2,
};

function listTasks() {
  return Object.values(TASKS).map(task => ({
    name: task.name,
    description: task.description,
    destructive: !!task.destructive,
    fromCommit: task.fromCommit || null,
  }));
}

/**
 * @param {string} name
 */
function getTask(name) {
  return TASKS[name] || null;
}

module.exports = {
  TASKS,
  listTasks,
  getTask,
};
