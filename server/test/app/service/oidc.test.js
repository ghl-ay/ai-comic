'use strict';

const assert = require('assert');
const {
  sanitizeReturnTo,
  mapOidcCallbackErrorCode,
  configFingerprint,
} = require('../../../app/service/oidc');

describe('test/app/service/oidc.test.js', () => {
  describe('sanitizeReturnTo()', () => {
    it('defaults empty/invalid to /comics', () => {
      assert.strictEqual(sanitizeReturnTo(null), '/comics');
      assert.strictEqual(sanitizeReturnTo(''), '/comics');
      assert.strictEqual(sanitizeReturnTo('https://evil.com'), '/comics');
      assert.strictEqual(sanitizeReturnTo('//evil.com'), '/comics');
      assert.strictEqual(sanitizeReturnTo('comics'), '/comics');
    });

    it('allows same-origin relative paths', () => {
      assert.strictEqual(sanitizeReturnTo('/comics'), '/comics');
      assert.strictEqual(sanitizeReturnTo('/login/oidc-setup'), '/login/oidc-setup');
      assert.strictEqual(sanitizeReturnTo('  /admin/users  '), '/admin/users');
    });
  });

  describe('mapOidcCallbackErrorCode()', () => {
    it('prefers err.oidcCode', () => {
      assert.strictEqual(
        mapOidcCallbackErrorCode({ oidcCode: 'state_invalid', error: 'access_denied' }),
        'state_invalid'
      );
    });

    it('maps access_denied from error or code', () => {
      assert.strictEqual(mapOidcCallbackErrorCode({ error: 'access_denied' }), 'access_denied');
      assert.strictEqual(mapOidcCallbackErrorCode({ code: 'access_denied' }), 'access_denied');
    });

    it('maps state and identity failures', () => {
      assert.strictEqual(
        mapOidcCallbackErrorCode({ status: 400, message: 'state 校验失败' }),
        'state_invalid'
      );
      assert.strictEqual(
        mapOidcCallbackErrorCode({ status: 502, message: '无法获取 OIDC 用户标识 (sub)' }),
        'identity_failed'
      );
    });

    it('falls back to callback_failed', () => {
      assert.strictEqual(mapOidcCallbackErrorCode(null), 'callback_failed');
      assert.strictEqual(mapOidcCallbackErrorCode({ message: 'boom' }), 'callback_failed');
    });
  });

  describe('configFingerprint()', () => {
    it('changes when secret changes', () => {
      const base = {
        issuer: 'https://idp.example',
        clientId: 'c1',
        clientSecret: 's1',
        redirectUri: 'http://localhost/cb',
        tokenAuthMethod: 'client_secret_basic',
      };
      const a = configFingerprint(base);
      const b = configFingerprint({ ...base, clientSecret: 's2' });
      assert.notStrictEqual(a, b);
      assert.strictEqual(a, configFingerprint({ ...base }));
    });
  });
});
