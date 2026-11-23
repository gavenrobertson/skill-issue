import { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';

export default function CodeEditor({ value, onChange, onRun, onCheck, fontSize = 14, theme = 'dark', readOnly = false }) {
  // Keep the latest callbacks in a ref so the keymap extension never has to be rebuilt.
  const handlers = useRef({ onRun, onCheck });
  useEffect(() => {
    handlers.current = { onRun, onCheck };
  });

  const extensions = useMemo(
    () => [
      cpp(),
      indentUnit.of('    '),
      EditorView.lineWrapping,
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
      }),
    ],
    [fontSize],
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
      basicSetup={{ tabSize: 4, foldGutter: false, highlightActiveLine: true, autocompletion: true }}
    />
  );
}
