// server/app/controller/ai-assist.js
const Controller = require('egg').Controller;

class AiAssistController extends Controller {
  async fillForm() {
    const { ctx } = this;
    const { schema, context, providerId } = ctx.request.body;

    if (!schema || typeof schema !== 'object') {
      ctx.status = 400;
      ctx.body = { error: '请提供表单结构 (schema)' };
      return;
    }

    if (!context || typeof context !== 'string') {
      ctx.status = 400;
      ctx.body = { error: '请提供上下文信息 (context)' };
      return;
    }

    try {
      const result = await ctx.service.aiText.fillForm({ schema, context, providerId });
      ctx.body = { data: result };
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = { error: err.message };
    }
  }
}

module.exports = AiAssistController;
