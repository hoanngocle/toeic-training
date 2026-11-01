import test from 'node:test';
import assert from 'node:assert/strict';
import { hasValidOrigin } from '../lib/request-origin.ts';

function request(origin?: string, host = '127.0.0.1:3000') {
  const headers = new Headers({ host });
  if (origin !== undefined) headers.set('origin', origin);
  return new Request('http://localhost:3000/api/learning', { method: 'POST', headers });
}

test('accepts the browser host when Next.js uses an internal hostname', () => {
  assert.equal(hasValidOrigin(request('http://127.0.0.1:3000')), true);
  assert.equal(hasValidOrigin(request('http://192.168.1.20:3000', '192.168.1.20:3000')), true);
});

test('rejects foreign origins, different ports/protocols, opaque and malformed origins', () => {
  for (const origin of ['https://evil.example', 'http://127.0.0.1:3001', 'https://127.0.0.1:3000', 'null', 'invalid']) {
    assert.equal(hasValidOrigin(request(origin)), false, origin);
  }
});

test('preserves direct requests and requests without Origin', () => {
  assert.equal(hasValidOrigin(request('http://localhost:3000', 'localhost:3000')), true);
  assert.equal(hasValidOrigin(request()), true);
  assert.equal(hasValidOrigin(new Request('http://localhost:3000/api/learning', {
    headers: { origin: 'http://localhost:3000' },
  })), true);
});

test('does not trust an arbitrary forwarded host', () => {
  const input = request('https://evil.example');
  input.headers.set('x-forwarded-host', 'evil.example');
  assert.equal(hasValidOrigin(input), false);
});
