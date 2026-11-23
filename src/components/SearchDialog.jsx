import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { course, loadSearchIndex } from '../lib/content.js';
import { lessonHref, go } from '../lib/router.js';

function snippet(lesson, text, terms) {
  const i = text.indexOf(terms[0]);
  if (i < 0 || !terms[0]) return lesson.summary;
  const start = Math.max(0, i - 50);
  return (
    (start ? '…' : '') +
    text
      .slice(start, i + 90)
      .replace(/\s+/g, ' ')
      .trim() +
    '…'
  );
}

export default function SearchDialog({ onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [index, setIndex] = useState(null); // lesson id -> full text, loaded on first open
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
    let alive = true;
    loadSearchIndex().then((i) => alive && setIndex(i));
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return course.lessons.slice(0, 8).map((l) => ({ l, snip: l.summary }));
    return course.lessons
      .map((l) => {
        const title = l.title.toLowerCase();
        const text = index?.[l.id] ?? `${title} ${l.summary.toLowerCase()} ${(l.headings || []).map((h) => h.text.toLowerCase()).join(' ')}`;
        const exTitles = l.exercises.map((e) => e.title.toLowerCase()).join(' ');
        if (!terms.every((t) => text.includes(t) || exTitles.includes(t) || l.moduleTitle.toLowerCase().includes(t))) return null;
        const score = terms.reduce((n, t) => n + (title.includes(t) ? 20 : 0) + (exTitles.includes(t) ? 5 : 0) + Math.min(10, text.split(t).length - 1), 0);
        return { l, score, snip: snippet(l, text, terms) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [q, index]);

  const open = (l) => {
    go(lessonHref(l));
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="search" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Search lessons">
        <div className="search-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={q}
            placeholder="Search lessons: pointers, switch, lambda capture…"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, results.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              }
              if (e.key === 'Enter' && results[sel]) open(results[sel].l);
            }}
          />
          <kbd>esc</kbd>
        </div>
        <ul className="search-results">
          {results.map(({ l, snip }, i) => (
            <li key={l.id}>
              <a href={lessonHref(l)} className={i === sel ? 'sel' : ''} onClick={onClose} onMouseEnter={() => setSel(i)}>
                <span className="muted small">{l.moduleTitle}</span>
                <strong>{l.title}</strong>
                {snip && <span className="snip">{snip}</span>}
              </a>
            </li>
          ))}
          {!results.length && <li className="muted pad">No lessons match "{q}".</li>}
        </ul>
      </div>
    </div>
  );
}
