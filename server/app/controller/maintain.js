'use strict';

const Controller = require('egg').Controller;
const { listTasks, getTask } = require('../maintain');
const { tokensMatch, extractToken, parseStep } = require('../maintain/lib');

/**
 * 数据库维护接口（token 保护，两步执行）
 *
 * GET  /api/maintain?token=...
 * POST /api/maintain/:name  body/query: { step: 1|2, token }
 *
 * step=1 分析（只读）
 * step=2 执行迁移
 */
class MaintainController extends Controller {
  assertToken() {
    const { ctx, app } = this;
    const expected = (app.config.maintain && app.config.maintain.token) || '';
    if (!expected) {
      ctx.status = 503;
      ctx.body = {
        error: '维护接口未启用：请配置环境变量 MAINTAIN_TOKEN',
      };
      return false;
    }
    const provided = extractToken(ctx);
    if (!tokensMatch(provided, expected)) {
      ctx.status = 401;
      ctx.body = { error: '无效的维护 token' };
      return false;
    }
    return true;
  }

  /** 列出可用维护任务 */
  async index() {
    const { ctx } = this;
    if (!this.assertToken()) return;

    ctx.body = {
      tasks: listTasks(),
      usage: {
        list: 'GET /api/maintain?token=YOUR_TOKEN',
        analyze: 'POST /api/maintain/:name  { "step": 1, "token": "..." }',
        execute: 'POST /api/maintain/:name  { "step": 2, "token": "..." }',
        header: '也可使用 Header: X-Maintain-Token',
        note: 'step=1 只分析不改库；step=2 真正执行。含 destructive=true 的任务会删数据，务必先 step=1。',
      },
    };
  }

  /** 执行单个维护任务 */
  async run() {
    const { ctx, app } = this;
    if (!this.assertToken()) return;

    const name = ctx.params.name;
    const task = getTask(name);
    if (!task) {
      ctx.status = 404;
      ctx.body = {
        error: `未知维护任务: ${name}`,
        available: listTasks().map(item => item.name),
      };
      return;
    }

    let step;
    try {
      step = parseStep(ctx);
    } catch (error) {
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
      return;
    }

    const db = app.db;
    ctx.logger.info('[maintain] task=%s step=%s', name, step);

    try {
      if (step === 1) {
        const analysis = task.analyze(db);
        ctx.body = {
          task: name,
          step: 1,
          mode: 'analyze',
          destructive: !!task.destructive,
          description: task.description,
          analysis,
        };
        return;
      }

      // step === 2
      const result = task.execute(db);
      ctx.logger.info('[maintain] task=%s executed ok', name);
      ctx.body = {
        task: name,
        step: 2,
        mode: 'execute',
        destructive: !!task.destructive,
        description: task.description,
        ...result,
      };
    } catch (error) {
      ctx.logger.error('[maintain] task=%s failed: %s', name, error);
      ctx.status = error.status || 500;
      ctx.body = {
        error: error.message || '维护任务执行失败',
        task: name,
        step,
      };
    }
  }
}

module.exports = MaintainController;
