'use strict';

const assert = require('assert');
const {
  tokensMatch,
  parseStep,
  columnExists,
  addColumnIfMissing,
} = require('../../../app/maintain/lib');
const Database = require('better-sqlite3');

describe('test/app/maintain/lib.test.js', () => {
  it('tokensMatch rejects wrong length and wrong value', () => {
    assert.strictEqual(tokensMatch('abc', 'abc'), true);
    assert.strictEqual(tokensMatch('abc', 'abd'), false);
    assert.strictEqual(tokensMatch('ab', 'abc'), false);
    assert.strictEqual(tokensMatch('', 'abc'), false);
  });

  it('parseStep only accepts 1 or 2', () => {
    assert.strictEqual(parseStep({ query: { step: '1' }, request: { body: {} }, get: () => '' }), 1);
    assert.strictEqual(parseStep({ query: {}, request: { body: { step: 2 } }, get: () => '' }), 2);
    assert.throws(
      () => parseStep({ query: { step: '3' }, request: { body: {} }, get: () => '' }),
      /step/
    );
  });

  it('addColumnIfMissing is idempotent', () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY)');
    assert.strictEqual(columnExists(db, 't', 'x'), false);
    assert.strictEqual(addColumnIfMissing(db, 't', 'x', 'TEXT'), true);
    assert.strictEqual(columnExists(db, 't', 'x'), true);
    assert.strictEqual(addColumnIfMissing(db, 't', 'x', 'TEXT'), false);
    db.close();
  });
});
