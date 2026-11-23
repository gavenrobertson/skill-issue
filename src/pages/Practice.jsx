import { useEffect, useMemo, useState } from 'react';
import { Shuffle, CircleCheck, Circle, CircleDot, Search, RotateCcw } from 'lucide-react';
import { course, allExercises } from '../lib/content.js';
import { useStore } from '../lib/store.js';
import { exerciseHref, lessonHref, go } from '../lib/router.js';

const DIFFS = ['easy', 'medium', 'hard'];
const STATUSES = [
  ['all', 'All'],
  ['todo', 'Not solved'],
  ['started', 'Started'],
  ['solved', 'Solved'],
];

/** Every exercise in the course, filterable, plus quizzes to retry. */
export default function Practice({ filter }) {
  const state = useStore();
  const [diff, setDiff] = useState(DIFFS.includes(filter) ? filter : 'all');
  const [status, setStatus] = useState('todo');
  const [mod, setMod] = useState('all');
  const [q, setQ] = useState('');
  useEffect(() => {
    document.title = 'Practice · skill::issue';
  }, []);

  const statusOf = (e) => (state.done[e.id] ? 'solved' : state.code[e.id] != null ? 'started' : 'todo');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allExercises.filter((e) => {
      if (diff !== 'all' && e.difficulty !== diff) return false;
      if (mod !== 'all' && e.lesson.moduleSlug !== mod) return false;
      const st = state.done[e.id] ? 'solved' : state.code[e.id] != null ? 'started' : 'todo';
      if (status === 'todo' && st === 'solved') return false;
      if (status === 'started' && st !== 'started') return false;
      if (status === 'solved' && st !== 'solved') return false;
      if (needle && !`${e.title} ${e.lesson.title} ${e.lesson.moduleTitle}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [diff, mod, status, q, state]);

  const random = () => {
    const pool = list.filter((e) => !state.done[e.id]);
    const pick = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length || list.length))];
    if (pick) go(exerciseHref(pick.lesson, pick));
  };

  const groups = [];
  for (const e of list) {
    const last = groups[groups.length - 1];
    if (last?.slug === e.lesson.moduleSlug) last.items.push(e);
    else groups.push({ slug: e.lesson.moduleSlug, title: e.lesson.moduleTitle, index: e.lesson.moduleIndex, items: [e] });
  }

  const wrongQuizzes = course.lessons.map((l) => ({ l, n: l.quizzes.filter((qz) => state.quiz[qz.id] && !state.quiz[qz.id].correct).length })).filter((x) => x.n);

  return (
    <div className="practice">
      <header className="page-head">
        <div>
          <h1>Practice</h1>
          <p className="muted">
            Every exercise in the course in one place. Filter by difficulty, or let the dice pick an unsolved one. Hard ones are real programs with hidden tests.
          </p>
        </div>
        <button className="btn primary" onClick={random} disabled={!list.length}>
          <Shuffle size={16} aria-hidden="true" /> Random exercise
        </button>
      </header>

      <div className="filters" role="group" aria-label="Filters">
        <div className="chips" role="radiogroup" aria-label="Difficulty">
          {['all', ...DIFFS].map((d) => {
            const total = d === 'all' ? allExercises.length : allExercises.filter((e) => e.difficulty === d).length;
            const done = (d === 'all' ? allExercises : allExercises.filter((e) => e.difficulty === d)).filter((e) => state.done[e.id]).length;
            return (
              <button key={d} role="radio" aria-checked={diff === d} className={`chip ${d}${diff === d ? ' on' : ''}`} onClick={() => setDiff(d)}>
                {d === 'all' ? 'All' : d[0].toUpperCase() + d.slice(1)}{' '}
                <span className="tabular muted">
                  {done}/{total}
                </span>
              </button>
            );
          })}
        </div>
        <div className="chips" role="radiogroup" aria-label="Status">
          {STATUSES.map(([v, label]) => (
            <button key={v} role="radio" aria-checked={status === v} className={`chip${status === v ? ' on' : ''}`} onClick={() => setStatus(v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <label className="sr-only" htmlFor="practice-module">
            Module
          </label>
          <select id="practice-module" value={mod} onChange={(e) => setMod(e.target.value)}>
            <option value="all">All modules</option>
            {course.modules.map((m) => (
              <option key={m.slug} value={m.slug}>
                {String(m.index).padStart(2, '0')} · {m.title}
              </option>
            ))}
          </select>
          <div className="search-field">
            <Search size={15} aria-hidden="true" />
            <label className="sr-only" htmlFor="practice-search">
              Filter exercises
            </label>
            <input id="practice-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title…" />
          </div>
        </div>
      </div>

      {wrongQuizzes.length > 0 && (
        <section className="card retry">
          <h2>
            <RotateCcw size={16} aria-hidden="true" /> Quizzes to retry
          </h2>
          <ul>
            {wrongQuizzes.map(({ l, n }) => (
              <li key={l.id}>
                <a href={lessonHref(l)}>
                  {l.moduleTitle} → {l.title}
                </a>{' '}
                <span className="muted">
                  ({n} wrong answer{n === 1 ? '' : 's'})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="muted result-count" aria-live="polite">
        {list.length} exercise{list.length === 1 ? '' : 's'}
      </p>
      {groups.map((g) => (
        <section key={g.slug} className="ex-group">
          <h2>
            <span className="mod-num">{String(g.index).padStart(2, '0')}</span> {g.title}
          </h2>
          <ul className="ex-list">
            {g.items.map((e) => {
              const st = statusOf(e);
              return (
                <li key={e.id}>
                  <a href={exerciseHref(e.lesson, e)} className={`ex-row ${st}`}>
                    {st === 'solved' ? (
                      <CircleCheck size={16} className="ok" aria-label="solved" />
                    ) : st === 'started' ? (
                      <CircleDot size={16} className="partial" aria-label="started" />
                    ) : (
                      <Circle size={16} className="todo" aria-label="not started" />
                    )}
                    <span className="ex-title">{e.title}</span>
                    <span className="ex-lesson muted">{e.lesson.title}</span>
                    {e.difficulty && <span className={`diff-badge ${e.difficulty}`}>{e.difficulty}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {!list.length && (
        <p className="empty">
          Nothing matches these filters.{' '}
          {status === 'todo' && (
            <>
              You may have solved them all.{' '}
              <button className="linklike" onClick={() => setStatus('all')}>
                Show solved exercises
              </button>
              .
            </>
          )}
        </p>
      )}
    </div>
  );
}
