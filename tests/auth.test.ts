import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scryptSync } from 'node:crypto';
import { verifyCredentials, createSession, verifySession, safeReturnPath } from '../lib/auth.ts';

process.env.AUTH_USERNAME = 'test-user';
process.env.AUTH_PASSWORD_HASH = `test-salt:${scryptSync('test-password', 'test-salt', 64).toString('hex')}`;
process.env.AUTH_SESSION_SECRET = 'test-secret-that-is-at-least-32-characters-long';

test('only the configured account and password can sign in', async () => {
  assert.equal(await verifyCredentials('test-user', 'test-password'), true);
  assert.equal(await verifyCredentials('test-user', 'wrong'), false);
  assert.equal(await verifyCredentials('other', 'test-password'), false);
  assert.equal(await verifyCredentials('', ''), false);
});

test('sessions reject tampering, expiry and secret rotation', () => {
  const token = createSession(1000);
  assert.equal(verifySession(token, 1001), true);
  assert.equal(verifySession(token + 'x', 1001), false);
  assert.equal(verifySession(token, 1000 + 7 * 86400), false);
  assert.equal(verifySession(undefined), false);
  assert.equal(verifySession('garbage'), false);
  const oldSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = 'another-secret-that-is-at-least-32-characters';
  assert.equal(verifySession(token, 1001), false);
  process.env.AUTH_SESSION_SECRET = oldSecret;
});

test('return destinations cannot redirect outside the app or back to login', () => {
  assert.equal(safeReturnPath('/tu-vung/example?mode=read'), '/tu-vung/example?mode=read');
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/login', '/api/auth/logout', null]) {
    assert.equal(safeReturnPath(path), '/');
  }
});
