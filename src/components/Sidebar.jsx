import { useState } from 'react';
import { ChevronDown, CircleCheck, Circle, CircleDot } from 'lucide-react';
import { course } from '../lib/content.js';
import { useStore, lessonProgress, moduleProgress } from '../lib/store.js';
import { lessonHref } from '../lib/router.js';

export default function Sidebar({ currentLessonId, onNavigate }) {
  const state = useStore();
  const currentModule = currentLessonId?.split('/')[0];
  const [overrides, setOverrides] = useState({}); // slug -> open?
  const isOpenFn = (slug) => overrides[slug] ?? slug === currentModule;
  const toggle = (slug) => setOverrides((o) => ({ ...o, [slug]: !isOpenFn(slug) }));

  return (
    <nav className="sidebar" aria-label="Course contents">
      {course.modules.map((mod) => {
        const p = moduleProgress(mod, state);
        const isOpen = isOpenFn(mod.slug);
        const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
        return (
          <div key={mod.slug} className={`side-module${isOpen ? ' open' : ''}`}>
            <button className="side-module-head" onClick={() => toggle(mod.slug)} aria-expanded={isOpen}>
              <span className="mod-num">{String(mod.index).padStart(2, '0')}</span>
              <span className="mod-title">{mod.title}</span>
              <span className="mod-pct" title={`${p.done}/${p.total} exercises & quizzes`}>
                {p.lessonsDone === p.lessons && p.lessons ? <CircleCheck size={14} className="ok" /> : `${pct}%`}
              </span>
              <ChevronDown size={14} className="chev" />
            </button>
            {isOpen && (
              <ul>
                {mod.lessons.map((l) => {
                  const lp = lessonProgress(l, state);
                  const current = l.id === currentLessonId;
                  return (
                    <li key={l.id}>
                      <a href={lessonHref(l)} className={`side-lesson${current ? ' current' : ''}`} onClick={onNavigate} aria-current={current ? 'page' : undefined}>
                        {lp.complete ? (
                          <CircleCheck size={14} className="ok" />
                        ) : lp.done > 0 || state.visited[l.id] ? (
                          <CircleDot size={14} className="partial" />
                        ) : (
                          <Circle size={14} className="todo" />
                        )}
                        <span>{l.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
