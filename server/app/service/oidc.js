// server/app/service/oidc.js
const Service = require('egg').Service;
const jwt = require('jsonwebtoken');
const { Issuer, generators } = require('openid-client');

const DEFAULT_OIDC_CONFIG = {
  enabled: false,
  displayName: '第三方登录',
  issuer: '',
  clientId: '',
  clientSecret: '',
  redirectUri: 'http://localhost:3000/api/auth/oidc/callback',
  scopes: [ 'openid', 'profile' ],
  stateTtlSec: 600,
  tokenAuthMethod: 'client_secret_basic',
};

const STATE_COOKIE = 'oidc_state';
const PENDING_COOKIE = 'oidc_pending';

/** 仅允许站内相对路径，禁止协议相对 //evil */
function sanitizeReturnTo(returnTo) {
  if (!returnTo || typeof returnTo !== 'string') {
    return '/comics';
  }
  const trimmed = returnTo.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/comics';
  }
  return trimmed;
}

/**
 * 将 callback 异常映射为固定短码（详情只写日志，不进 URL）。
 * 优先读 err.oidcCode；兼容 openid-client 的 err.error / 本服务 err.code。
 */
function mapOidcCallbackErrorCode(err) {
  if (!err) return 'callback_failed';
  if (err.oidcCode) return err.oidcCode;
  const oauthCode = err.error || err.code;
  if (oauthCode === 'access_denied') return 'access_denied';
  if (err.status === 400 && /state|登录状态|回调参数/i.test(String(err.message || ''))) {
    return 'state_invalid';
  }
  if (err.status === 502 || /sub|用户标识/i.test(String(err.message || ''))) {
    return 'identity_failed';
  }
  return 'callback_failed';
}

/** 配置指纹：多 worker 下 secret 等变更后自动 miss 缓存 */
function configFingerprint(config) {
  return [
    config.issuer || '',
    config.clientId || '',
    config.clientSecret || '',
    config.redirectUri || '',
    config.tokenAuthMethod || 'client_secret_basic',
  ].join('\0');
}

function createOidcError(message, { status = 400, oidcCode, code, error } = {}) {
  const err = new Error(message);
  err.status = status;
  if (oidcCode) err.oidcCode = oidcCode;
  if (code) err.code = code;
  if (error) err.error = error;
  return err;
}

class OidcService extends Service {
  constructor(ctx) {
    super(ctx);
    // 进程级缓存；命中条件含 fingerprint，避免多 worker 仅比 issuer
    if (!this.app._oidcCache) {
      this.app._oidcCache = { fingerprint: null, client: null, discovered: null };
    }
  }

  getDefaultConfig() {
    return { ...DEFAULT_OIDC_CONFIG, scopes: [ ...DEFAULT_OIDC_CONFIG.scopes ] };
  }

  /** 从 DB 读取原始配置（含 secret） */
  getRawConfig() {
    const stored = this.ctx.service.db.getConfig('auth', 'oidc');
    if (!stored || typeof stored !== 'object') {
      return this.getDefaultConfig();
    }
    return {
      ...this.getDefaultConfig(),
      ...stored,
      scopes: Array.isArray(stored.scopes) && stored.scopes.length
        ? stored.scopes
        : [ ...DEFAULT_OIDC_CONFIG.scopes ],
    };
  }

  /** 对外返回（脱敏） */
  getPublicConfig() {
    const config = this.getRawConfig();
    const hasClientSecret = Boolean(config.clientSecret);
    return {
      enabled: Boolean(config.enabled),
      displayName: config.displayName || DEFAULT_OIDC_CONFIG.displayName,
      issuer: config.issuer || '',
      clientId: config.clientId || '',
      clientSecret: hasClientSecret ? '********' : '',
      hasClientSecret,
      redirectUri: config.redirectUri || DEFAULT_OIDC_CONFIG.redirectUri,
      scopes: config.scopes,
      stateTtlSec: config.stateTtlSec || DEFAULT_OIDC_CONFIG.stateTtlSec,
      tokenAuthMethod: config.tokenAuthMethod || 'client_secret_basic',
    };
  }

  /** 登录页仅需的摘要 */
  getStatus() {
    const config = this.getRawConfig();
    return {
      enabled: Boolean(config.enabled) && this.isConfigComplete(config),
      displayName: config.displayName || DEFAULT_OIDC_CONFIG.displayName,
    };
  }

  isConfigComplete(config = this.getRawConfig()) {
    return Boolean(
      config.issuer &&
      config.clientId &&
      config.clientSecret &&
      config.redirectUri
    );
  }

  assertEnabled() {
    const config = this.getRawConfig();
    if (!config.enabled || !this.isConfigComplete(config)) {
      throw createOidcError('OIDC 未启用或配置不完整', {
        status: 404,
        oidcCode: 'not_enabled',
      });
    }
    return config;
  }

  /**
   * 保存配置；clientSecret 为空字符串时保留原值
   */
  saveConfig(input) {
    const current = this.getRawConfig();
    const next = {
      ...current,
      ...input,
    };

    if (input.clientSecret === undefined || input.clientSecret === null || input.clientSecret === '' || input.clientSecret === '********') {
      next.clientSecret = current.clientSecret || '';
    } else {
      next.clientSecret = String(input.clientSecret).trim();
    }

    if (input.clientId !== undefined && input.clientId !== null) {
      next.clientId = String(input.clientId).trim();
    }
    // 允许显式清空（空串），非空则规范化去尾斜杠
    if (input.issuer !== undefined && input.issuer !== null) {
      next.issuer = String(input.issuer).trim().replace(/\/$/, '');
    }
    if (input.redirectUri !== undefined && input.redirectUri !== null) {
      next.redirectUri = String(input.redirectUri).trim();
    }
    if (input.displayName !== undefined && input.displayName !== null) {
      next.displayName = String(input.displayName).trim() || DEFAULT_OIDC_CONFIG.displayName;
    }

    if (Array.isArray(input.scopes)) {
      next.scopes = input.scopes.filter(Boolean);
    }
    // 清理历史字段（若曾写入 configs）
    delete next.allowedReturnOrigins;

    if (input.tokenAuthMethod === 'client_secret_post' || input.tokenAuthMethod === 'client_secret_basic') {
      next.tokenAuthMethod = input.tokenAuthMethod;
    }

    if (next.enabled) {
      const required = [ 'issuer', 'clientId', 'clientSecret', 'redirectUri', 'displayName' ];
      for (const field of required) {
        if (!next[field]) {
          throw createOidcError(`启用 OIDC 时 ${field} 不能为空`, { status: 400 });
        }
      }
    }

    next.enabled = Boolean(next.enabled);
    next.stateTtlSec = Number(next.stateTtlSec) > 0 ? Number(next.stateTtlSec) : DEFAULT_OIDC_CONFIG.stateTtlSec;
    if (!next.tokenAuthMethod) {
      next.tokenAuthMethod = 'client_secret_basic';
    }

    this.ctx.service.db.setConfig('auth', 'oidc', next);
    this.invalidateCache();
    return this.getPublicConfig();
  }

  invalidateCache() {
    this.app._oidcCache = { fingerprint: null, client: null, discovered: null };
  }

  async getClient() {
    const config = this.assertEnabled();
    const fingerprint = configFingerprint(config);
    const cache = this.app._oidcCache;
    if (cache.client && cache.fingerprint === fingerprint) {
      return { client: cache.client, config };
    }

    const discovered = await Issuer.discover(config.issuer);
    if (discovered.issuer !== config.issuer && discovered.issuer !== config.issuer.replace(/\/$/, '')) {
      // 允许尾斜杠差异外，仍以 discovery 返回的 issuer 为准记录
      this.ctx.logger.warn('[oidc] discovery issuer 与配置不完全一致: %s vs %s', discovered.issuer, config.issuer);
    }

    // Spring Authorization Server 等常见实现默认 client_secret_basic；
    // Discovery 也支持 client_secret_post，可在配置 tokenAuthMethod 覆盖
    const tokenAuthMethod = config.tokenAuthMethod === 'client_secret_post'
      ? 'client_secret_post'
      : 'client_secret_basic';

    const client = new discovered.Client({
      client_id: String(config.clientId || '').trim(),
      client_secret: String(config.clientSecret || '').trim(),
      redirect_uris: [ config.redirectUri ],
      response_types: [ 'code' ],
      token_endpoint_auth_method: tokenAuthMethod,
    });

    this.app._oidcCache = {
      fingerprint,
      client,
      discovered,
    };
    return { client, config, discovered };
  }

  /** 测试 Discovery（可用草稿字段） */
  async testDiscovery(draft = {}) {
    const merged = { ...this.getRawConfig(), ...draft };
    if (draft.clientSecret === '' || draft.clientSecret === '********') {
      merged.clientSecret = this.getRawConfig().clientSecret;
    }
    if (!merged.issuer) {
      throw createOidcError('issuer 不能为空', { status: 400 });
    }
    const discovered = await Issuer.discover(merged.issuer);
    return {
      ok: true,
      issuer: discovered.issuer,
      authorization_endpoint: discovered.authorization_endpoint,
      token_endpoint: discovered.token_endpoint,
      userinfo_endpoint: discovered.userinfo_endpoint,
      jwks_uri: discovered.jwks_uri,
      code_challenge_methods_supported: discovered.code_challenge_methods_supported,
    };
  }

  sanitizeReturnTo(returnTo) {
    return sanitizeReturnTo(returnTo);
  }

  _cookieOptions(maxAgeSec) {
    return {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSec * 1000,
      signed: false,
      overwrite: true,
    };
  }

  _signPayload(payload, ttlSec) {
    const secret = this.app.config.jwt.secret;
    return jwt.sign(payload, secret, { expiresIn: ttlSec });
  }

  _verifyPayload(token) {
    const secret = this.app.config.jwt.secret;
    return jwt.verify(token, secret);
  }

  setStateCookie(data, ttlSec) {
    const token = this._signPayload(data, ttlSec);
    this.ctx.cookies.set(STATE_COOKIE, token, this._cookieOptions(ttlSec));
  }

  consumeStateCookie() {
    const token = this.ctx.cookies.get(STATE_COOKIE, { signed: false });
    this.ctx.cookies.set(STATE_COOKIE, null, this._cookieOptions(0));
    if (!token) {
      return null;
    }
    try {
      return this._verifyPayload(token);
    } catch (err) {
      return null;
    }
  }

  setPendingCookie(data, ttlSec) {
    const token = this._signPayload(data, ttlSec);
    this.ctx.cookies.set(PENDING_COOKIE, token, this._cookieOptions(ttlSec));
  }

  getPending() {
    const token = this.ctx.cookies.get(PENDING_COOKIE, { signed: false });
    if (!token) {
      return null;
    }
    try {
      return this._verifyPayload(token);
    } catch (err) {
      return null;
    }
  }

  clearPendingCookie() {
    this.ctx.cookies.set(PENDING_COOKIE, null, this._cookieOptions(0));
  }

  requirePending() {
    const pending = this.getPending();
    if (!pending || !pending.sub || !pending.issuer) {
      throw createOidcError('第三方登录会话已过期，请重新登录', {
        status: 401,
        oidcCode: 'pending_expired',
      });
    }
    return pending;
  }

  async buildAuthorizationRedirect(returnTo) {
    const { client, config } = await this.getClient();
    const ttlSec = config.stateTtlSec || DEFAULT_OIDC_CONFIG.stateTtlSec;

    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const safeReturnTo = sanitizeReturnTo(returnTo);

    this.setStateCookie({
      state,
      nonce,
      codeVerifier,
      returnTo: safeReturnTo,
    }, ttlSec);

    const scope = (config.scopes || DEFAULT_OIDC_CONFIG.scopes).join(' ');
    return client.authorizationUrl({
      scope,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: config.redirectUri,
    });
  }

  async handleCallback(query) {
    const { client, config } = await this.getClient();
    const stored = this.consumeStateCookie();
    if (!stored || !stored.state || !stored.codeVerifier || !stored.nonce) {
      throw createOidcError('登录状态已失效，请重新发起第三方登录', {
        status: 400,
        oidcCode: 'state_invalid',
      });
    }

    if (query.error) {
      const oauthError = String(query.error);
      throw createOidcError(query.error_description || query.error, {
        status: 400,
        oidcCode: oauthError === 'access_denied' ? 'access_denied' : 'callback_failed',
        code: oauthError,
        error: oauthError,
      });
    }

    if (!query.code || !query.state) {
      throw createOidcError('回调参数不完整', {
        status: 400,
        oidcCode: 'state_invalid',
      });
    }

    if (query.state !== stored.state) {
      throw createOidcError('state 校验失败', {
        status: 400,
        oidcCode: 'state_invalid',
      });
    }

    // 直接传 query 对象（避免依赖 IncomingMessage 形态）
    const params = {
      code: query.code,
      state: query.state,
    };
    if (query.session_state) params.session_state = query.session_state;
    if (query.iss) params.iss = query.iss;

    const tokenSet = await client.callback(config.redirectUri, params, {
      state: stored.state,
      nonce: stored.nonce,
      code_verifier: stored.codeVerifier,
    });

    let claims = {};
    try {
      claims = tokenSet.claims() || {};
    } catch (err) {
      this.ctx.logger.warn('[oidc] id_token claims 解析失败: %s', err.message);
    }

    let userinfo = {};
    if (tokenSet.access_token) {
      try {
        userinfo = await client.userinfo(tokenSet.access_token);
      } catch (err) {
        this.ctx.logger.warn('[oidc] userinfo 请求失败: %s', err.message);
      }
    }

    const sub = userinfo.sub || claims.sub;
    if (!sub) {
      throw createOidcError('无法获取 OIDC 用户标识 (sub)', {
        status: 502,
        oidcCode: 'identity_failed',
      });
    }

    const issuer = config.issuer;
    const profile = {
      sub: String(sub),
      issuer,
      preferredUsername: userinfo.preferred_username || claims.preferred_username || '',
      name: userinfo.name || claims.name || '',
      picture: userinfo.picture || claims.picture || '',
    };

    const boundUser = this.ctx.service.db.findUserByOidc(issuer, profile.sub);
    if (boundUser) {
      return {
        type: 'login',
        user: boundUser,
        returnTo: stored.returnTo || '/comics',
      };
    }

    const ttlSec = config.stateTtlSec || DEFAULT_OIDC_CONFIG.stateTtlSec;
    this.setPendingCookie({
      sub: profile.sub,
      issuer: profile.issuer,
      preferredUsername: profile.preferredUsername,
      name: profile.name,
      picture: profile.picture,
    }, ttlSec);

    return {
      type: 'setup',
      profile,
      returnTo: stored.returnTo || '/comics',
    };
  }

  getPendingSummary() {
    const pending = this.requirePending();
    return {
      preferredUsername: pending.preferredUsername || '',
      name: pending.name || '',
      picture: pending.picture || '',
      issuer: pending.issuer,
    };
  }

  /** 绑定已有账号 */
  async bindExisting(username, password) {
    const pending = this.requirePending();
    const user = await this.ctx.service.auth.verifyCredentials(username, password);

    const result = this.ctx.service.db.bindUserOidc(user.id, pending.issuer, pending.sub, {
      displayName: pending.name || pending.preferredUsername || null,
      avatarUrl: pending.picture || null,
    });

    if (!result.ok) {
      if (result.reason === 'already_bound') {
        throw createOidcError('该账号已绑定其他第三方身份，请换账号或联系管理员解绑', {
          status: 409,
        });
      }
      if (result.reason === 'sub_taken') {
        throw createOidcError('该第三方身份已绑定其他账号，请联系管理员', {
          status: 409,
        });
      }
      throw createOidcError('绑定失败', { status: 400 });
    }

    this.clearPendingCookie();
    const tokenResult = await this.ctx.service.auth.issueTokenForUser(user.id);
    return tokenResult;
  }

  /** 新建账号并绑定（创建+绑定同事务；OIDC 仅 bind/清 pending/发 token） */
  async registerAndBind(username, password) {
    const pending = this.requirePending();

    const userId = await this.ctx.service.auth.registerUserOnly(username, password, {
      issuer: pending.issuer,
      sub: pending.sub,
      profile: {
        displayName: pending.name || pending.preferredUsername || null,
        avatarUrl: pending.picture || null,
      },
    });

    this.clearPendingCookie();
    return this.ctx.service.auth.issueTokenForUser(userId);
  }
}

module.exports = OidcService;
module.exports.sanitizeReturnTo = sanitizeReturnTo;
module.exports.mapOidcCallbackErrorCode = mapOidcCallbackErrorCode;
module.exports.configFingerprint = configFingerprint;
