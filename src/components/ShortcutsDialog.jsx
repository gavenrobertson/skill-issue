import { useEffect, useRef } from 'react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

const GROUPS = [
  [
    'Editor',
    [
      [[mod, 'Enter'], 'Compile and run'],
      [[mod, 'Shift', 'Enter'], 'Check against the tests'],
      [['Ctrl', 'Space'], 'Autocomplete (try typing main, fori, forr, class)'],
      [[mod, '/'], 'Toggle comment'],
      [['Tab'], 'Indent (Shift+Tab to outdent)'],
      [['Esc', 'Tab'], 'Leave the editor with the keyboard'],
    ],
  ],
  [
    'Navigation',
    [
      [[mod, 'K'], 'Search lessons'],
      [['/'], 'Search lessons'],
      [['Alt', '←'], 'Previous lesson'],
      [['Alt', '→'], 'Next lesson'],
      [['?'], 'Show this list'],
    ],
  ],
];

export default function ShortcutsDialog({ onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="shortcuts" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" tabIndex={-1} ref={ref} onMouseDown={(e) => e.stopPropagation()}>
        <div className="shortcuts-head">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {GROUPS.map(([title, items]) => (
          <section key={title}>
            <h3>{title}</h3>
            <dl>
              {items.map(([keys, label]) => (
                <div key={label} className="shortcut">
                  <dt>
                    {keys.map((k, i) => (
                      <kbd key={i}>{k}</kbd>
                    ))}
                  </dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
