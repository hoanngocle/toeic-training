import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { renderLesson } = require('./helpers/render-lesson.cjs') as { renderLesson: (slug: string) => string };

test('opening an Essential lesson renders its word list without unopened exercise forms', () => {
  const html = renderLesson('essential-01');
  assert.match(html, /Từ vựng trong bài/);
  assert.ok(!html.includes('<fieldset'), 'Unopened exercises must not render fieldsets');
  assert.ok(Buffer.byteLength(html) < 60000, `Initial HTML is ${Buffer.byteLength(html)} bytes`);
});

test('opening an original lesson does not render hidden Writing and Test controls', () => {
  const html = renderLesson('lesson-1');
  assert.match(html, /Từ vựng trong bài/);
  assert.ok(!html.includes('id="writing-lesson-1"'), 'Unopened Writing must not render its input');
  assert.ok(!html.includes('name="test-format-lesson-1"'), 'Unopened Test must not render its controls');
});

test('collapsed word examples do not contribute hidden markup to initial lesson loading', () => {
  for (const slug of ['lesson-1', 'essential-01']) {
    const html = renderLesson(slug);
    assert.ok(!html.includes('class="vocab-exampleLabel"'), 'Examples should render after expansion');
    assert.ok(html.includes('class="vocab-exampleToggle"'), 'Example buttons remain available');
  }
});
