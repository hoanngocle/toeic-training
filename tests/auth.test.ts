import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeReturnPath } from '../lib/auth.ts';

test('return destinations cannot redirect outside the app or back to login', () => {
  assert.equal(safeReturnPath('/achievements'), '/achievements');
  assert.equal(safeReturnPath('/tu-vung/example?mode=read'), '/tu-vung/example?mode=read');
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/login', '/api/auth/logout', null]) {
    assert.equal(safeReturnPath(path), '/');
  }
});
