import { useEffect, useMemo } from 'react';
import { ArrowRight, Terminal, Trophy, ListChecks, BookOpen, Flame, Dumbbell } from 'lucide-react';
import { course, lessonById, totals, allExercises } from '../lib/content.js';
import { useStore, moduleProgress, lessonProgress, activityByDay, streak, dayKey } from '../lib/store.js';
import { lessonHref, exerciseHref } from '../lib/router.js';

const WEEKS = 18;

export default function Home() {
  const state = useStore();
  useEffect(() => {
    document.title = 'skill::issue · Learn C++';
  }, []);
  const doneEx = allExercises.filter((e) => state.done[e.id]).length;
  const doneQuiz = course.lessons.reduce((n, l) => n + l.quizzes.filter((q) => state.quiz[q.id]?.correct).length, 0);
  const started = Object.keys(state.visited).length > 0;
  const pct = totals.exercises + totals.quizzes ? Math.round(((doneEx + doneQuiz) / (totals.exercises + totals.quizzes)) * 100) : 0;

  // Resume: the last lesson if unfinished, otherwise the first unfinished lesson after it.
  const resume = useMemo(() => {
    const last = state.last && lessonById.get(state.last);
    const start = last ? course.lessons.indexOf(last) : 0;
    for (let i = start; i < course.lessons.length; i++) if (!lessonProgress(course.lessons[i], state).complete) return course.lessons[i];
    return last || course.lessons[0];
  }, [state]);
  const nextEx = resume?.exercises.find((e) => !state.done[e.id]);

  const days = useMemo(() => activityByDay(state), [state]);
  const currentStreak = streak(days);
  const byDiff = ['easy', 'medium', 'hard'].map((d) => {
    const list = allExercises.filter((e) => e.difficulty === d);
    return { d, total: list.length, done: list.filter((e) => state.done[e.id]).length };
  });

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Interactive C++ · zero to hero</p>
          <h1>
            Learn C++ by <span className="accent">writing</span> C++.
          </h1>
          <p className="lead">
            {course.modules.length} modules, {totals.lessons} lessons, {totals.exercises} auto-graded exercises and {totals.quizzes} quizzes, from <code>int main()</code> to
            templates, move semantics and concurrency. Every exercise is compiled with a real GCC and checked against tests.
          </p>
          <div className="hero-actions">
            {resume && (
              <a className="btn primary lg" href={nextEx && started ? exerciseHref(resume, nextEx) : lessonHref(resume)}>
                {started ? 'Continue' : 'Start learning'} <ArrowRight size={17} aria-hidden="true" />
              </a>
            )}
            <a className="btn lg" href="#/practice">
              <Dumbbell size={17} aria-hidden="true" /> Practice
            </a>
            <a className="btn lg ghost" href="#/playground">
              <Terminal size={17} aria-hidden="true" /> Playground
            </a>
          </div>
          {started && resume && (
            <p className="muted resume-note">
              Up next:{' '}
              <a href={lessonHref(resume)}>
                {resume.moduleTitle} → {resume.title}
              </a>
              {nextEx && <> · Exercise: {nextEx.title}</>}
            </p>
          )}
        </div>
        <div className="hero-stats">
          <div className="stats-row">
            <Stat icon={<Trophy size={18} />} value={`${pct}%`} label="complete" />
            <Stat icon={<ListChecks size={18} />} value={`${doneEx}/${totals.exercises}`} label="exercises" />
            <Stat icon={<BookOpen size={18} />} value={`${doneQuiz}/${totals.quizzes}`} label="quizzes" />
            <Stat icon={<Flame size={18} />} value={currentStreak} label={`day streak`} />
          </div>
          <div className="progress big" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress">
            <div style={{ width: `${pct}%` }} />
          </div>
          <div className="diff-progress">
            {byDiff.map(({ d, total, done }) => (
              <a key={d} href={`#/practice/${d}`} className={`diff-stat ${d}`}>
                <span className={`diff-badge ${d}`}>{d}</span>
                <span className="tabular">
                  {done}/{total}
                </span>
              </a>
            ))}
          </div>
          <Heatmap days={days} />
        </div>
      </section>

      <h2 className="section-title">Modules</h2>
      <section className="modules-grid">
        {course.modules.map((mod) => {
          const p = moduleProgress(mod, state);
          const pc = p.total ? Math.round((p.done / p.total) * 100) : 0;
          const complete = p.lessons && p.lessonsDone === p.lessons;
          return (
            <a key={mod.slug} className={`module-card${complete ? ' complete' : ''}`} href={lessonHref(mod.lessons[0])}>
              <div className="module-card-top">
                <span className="mod-num">{String(mod.index).padStart(2, '0')}</span>
                <span className="muted">{complete ? 'Complete ✓' : `${p.lessonsDone}/${p.lessons} lessons`}</span>
              </div>
              <h3>{mod.title}</h3>
              <p>{mod.description}</p>
              <div className="progress" aria-hidden="true">
                <div style={{ width: `${pc}%` }} />
              </div>
            </a>
          );
        })}
      </section>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="stat">
      <span className="stat-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

/** GitHub-style activity grid for the last WEEKS weeks. */
function Heatmap({ days }) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  // Start on the Sunday WEEKS-1 weeks before this week's Sunday, so columns are whole weeks.
  start.setDate(start.getDate() - (WEEKS - 1) * 7 - start.getDay());
  const cells = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > today) break;
    const n = days[dayKey(d.getTime())] || 0;
    cells.push({ key: dayKey(d.getTime()), n, level: n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4 });
  }
  const active = cells.filter((c) => c.n).length;
  return (
    <div className="heatmap-wrap">
      <div className="heatmap" role="img" aria-label={`Activity: practiced on ${active} of the last ${cells.length} days`}>
        {cells.map((c) => (
          <span key={c.key} className={`cell l${c.level}`} title={`${c.key}: ${c.n} completed`} />
        ))}
      </div>
      <span className="muted small">{active ? `Practiced on ${active} day${active === 1 ? '' : 's'} in the last ${WEEKS} weeks` : 'Your practice days will show up here'}</span>
    </div>
  );
}
