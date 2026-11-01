import assert from 'node:assert/strict';
import { test } from 'node:test';

test('rejects missing, empty and overlong vocabulary before synthesis', async () => {
  const { GET } = await import('../app/api/tts/route.ts');
  for (const text of [null, '', '   ', 'a'.repeat(201)]) {
    const url = new URL('http://localhost/api/tts');
    if (text !== null) url.searchParams.set('text', text);
    const response = await GET(new Request(url));
    assert.equal(response.status, 400);
  }
});

test('returns a retryable error when Python cannot start', async () => {
  const { GET } = await import('../app/api/tts/route.ts');
  const previous = process.env.TTS_PYTHON;
  process.env.TTS_PYTHON = '/nonexistent/tts-python';
  try {
    const response = await GET(new Request('http://localhost/api/tts?text=appointment'));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /thử lại/);
  } finally {
    if (previous === undefined) delete process.env.TTS_PYTHON;
    else process.env.TTS_PYTHON = previous;
  }
});
