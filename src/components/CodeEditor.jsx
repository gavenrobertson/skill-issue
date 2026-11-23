import { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { indentUnit, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { cppCompletions } from '../lib/completions.js';

// One Dark's coral (#e06c75) is just under WCAG AA contrast on its background; brighten it slightly.
const darkContrastFix = [
  syntaxHighlighting(HighlightStyle.define([{ tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#ef8a92' }])),
  EditorView.theme({ '.cm-gutters': { color: '#9aa3b5' } }, { dark: true }),
];
// The default light theme's strings/numbers are too faint on white.
const lightContrastFix = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.string, t.special(t.string)], color: '#a11' },
    { tag: [t.number, t.bool, t.atom], color: '#164' },
    { tag: [t.processingInstruction, t.meta], color: '#555' },
  ]),
);

/** Convert parsed compiler diagnostics into CodeMirror diagnostics for the given document. */
function toCm(doc, diags) {
  const out = [];
  for (const d of diags) {
    if (d.line < 1 || d.line > doc.lines) continue;
    const line = doc.line(d.line);
    const from = Math.min(line.from + Math.max(0, d.col - 1), line.to);
    // Underline the token at the column (or the whole line if the column is at its end).
    const rest = doc.sliceString(from, line.to);
    const word = rest.match(/^[\w:.]+|^./)?.[0] || '';
    const to = from === line.to ? line.to : from + Math.max(1, word.length);
    out.push({
      from: from === line.to && line.from < line.to ? line.from : from,
      to,
      severity: d.severity,
      message: d.notes.length
        ? `${d.message}\n${d.notes
            .slice(0, 3)
            .map((n) => `note: ${n}`)
            .join('\n')}`
        : d.message,
      source: 'gcc',
    });
  }
  return out;
}

export default function CodeEditor({ value, onChange, onRun, onCheck, onView, diagnostics, fontSize = 14, theme = 'dark', readOnly = false, label = 'C++ code editor' }) {
  // Keep the latest callbacks in a ref so the keymap extension never has to be rebuilt.
  const handlers = useRef({ onRun, onCheck });
  const viewRef = useRef(null);
  useEffect(() => {
    handlers.current = { onRun, onCheck };
  });

  // Show compiler errors and warnings inline (squiggles + gutter markers).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch(setDiagnostics(view.state, diagnostics?.length ? toCm(view.state.doc, diagnostics) : []));
  }, [diagnostics, value]);

  const extensions = useMemo(
    () => [
      cpp(),
      Prec.high(theme === 'dark' ? darkContrastFix : lightContrastFix),
      ...cppCompletions,
      lintGutter(),
      indentUnit.of('    '),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': label }),
      Prec.highest(
        // The ref is read only when a key is pressed, never during render.
        // eslint-disable-next-line react-hooks/refs
        keymap.of([
          { key: 'Mod-Enter', run: () => (handlers.current.onRun?.(), true) },
          { key: 'Mod-Shift-Enter', run: () => (handlers.current.onCheck?.(), true) },
          { key: 'Mod-s', run: () => true }, // code autosaves; don't open the browser's save dialog
        ]),
      ),
      EditorView.theme({
        '&': { fontSize: `${fontSize}px`, height: '100%' },
        '.cm-scroller': { fontFamily: "'JetBrains Mono', ui-monospace, monospace", lineHeight: '1.55' },
        '.cm-content': { paddingBottom: '40px' },
        '.cm-tooltip-lint': { maxWidth: '520px', whiteSpace: 'pre-wrap' },
      }),
    ],
    [fontSize, label, theme],
  );

  return (
    <CodeMirror
      className="code-editor"
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={theme === 'dark' ? oneDark : 'light'}
      readOnly={readOnly}
      height="100%"
      onCreateEditor={(view) => {
        viewRef.current = view;
        onView?.(view);
      }}
      basicSetup={{ tabSize: 4, foldGutter: false, highlightActiveLine: true, autocompletion: true }}
    />
  );
}
