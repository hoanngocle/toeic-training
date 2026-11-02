/* eslint-disable @typescript-eslint/no-require-imports -- This isolated SSR harness instruments the CommonJS loader for TSX and Next request-context stubs. */
// Isolated React SSR: Next's request context is unnecessary for public lesson UI.
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
const originalLoad = Module._load;

Module._load = function (id, ...args) {
  if (id === 'server-only' || id.endsWith('.css')) return {};
  if (id === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
  if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
  return originalLoad.call(this, id, ...args);
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    module._compile(outputText, filename);
  };
}

const { getLesson, lessonSummaries } = require('../../components/vocabulary/catalog.ts');
const { essentialLessons, getPublicSections } = require('../../lib/essential/catalog.ts');
const LessonDetail = require('../../components/vocabulary/lesson-detail.tsx').default;

exports.renderLesson = slug => {
  const lesson = getLesson(slug);
  const book = essentialLessons.find(item => item.slug === slug);
  const navigation = lessonSummaries.filter(item => item.source === lesson.source).map(({ slug, title, count }) => ({ slug, title, count }));
  return renderToString(React.createElement(LessonDetail, { lesson, navigation, sections: book ? getPublicSections(book) : undefined }));
};
