import { useMemo, useState } from 'react';
import { CircleCheck, Code2, ChevronLeft, ChevronRight, CircleX, ListTree } from 'lucide-react';
import { renderMarkdown, renderInline } from '../lib/markdown.js';
import { useStore, setQuiz, clearQuiz, lessonProgress } from '../lib/store.js';
import { neighbors } from '../lib/content.js';
import { splitFences } from '../lib/parse.js';
import { lessonHref } from '../lib/router.js';

export default function Lesson({ lesson, onRunExample, onOpenExercise, activeKey }) {
  const state = useStore();
  const { prev, next } = neighbors(lesson.id);
  const progress = lessonProgress(lesson, state);

  // Event delegation for buttons inside rendered Markdown (run, copy, heading anchors).
  const onClick = (e) => {
    const anchor = e.target.closest('[data-anchor]');
    if (anchor) {
      e.preventDefault();
      scrollToId(anchor.dataset.anchor);
      return;
    }
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const code = copy.closest('.codeblock')?.querySelector('pre code')?.textContent ?? '';
      navigator.clipboard?.writeText(code).then(
        () => {
          copy.textContent = 'Copied';
          setTimeout(() => (copy.textContent = 'Copy'), 1500);
        },
        () => {},
      );
      return;
    }
    const btn = e.target.closest('[data-run]');
    if (!btn) return;
    const code = btn.closest('.codeblock')?.querySelector('pre code')?.textContent;
    if (code != null) onRunExample(code);
  };

  let exNum = 0;
  return (
    <article className="lesson" onClick={onClick}>
      <header className="lesson-header">
        <div className="eyebrow">
          Module {lesson.moduleIndex} · {lesson.moduleTitle} · Lesson {lesson.index}
        </div>
        <h1>{lesson.title}</h1>
        {lesson.summary && <p className="lead">{lesson.summary}</p>}
        {progress.total > 0 && (
          <div className="lesson-meta">
            <span>
              {lesson.exercises.length} exercise{lesson.exercises.length === 1 ? '' : 's'} · {lesson.quizzes.length} quiz{lesson.quizzes.length === 1 ? '' : 'zes'}
            </span>
            <span className={`badge ${progress.complete ? 'ok' : ''}`}>{progress.complete ? 'Complete' : `${progress.done}/${progress.total} done`}</span>
          </div>
        )}
      </header>

      <Contents lesson={lesson} state={state} />

      {lesson.blocks.map((b, i) => {
        if (b.kind === 'prose') return <Prose key={i} md={b.md} />;
        if (b.kind === 'quiz') return <Quiz key={b.id} quiz={b} />;
        exNum++;
        return <ExerciseCard key={b.id} ex={b} n={exNum} done={Boolean(state.done[b.id])} active={activeKey === b.id} onOpen={() => onOpenExercise(b.id)} />;
      })}

      <nav className="lesson-nav">
        {prev ? (
          <a className="nav-card" href={lessonHref(prev)}>
            <ChevronLeft size={18} />
            <span>
              <small>Previous</small>
              {prev.title}
            </span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a className="nav-card next" href={lessonHref(next)}>
            <span>
              <small>Next</small>
              {next.title}
            </span>
            <ChevronRight size={18} />
          </a>
        ) : (
          <a className="nav-card next" href="#/">
            <span>
              <small>Finished!</small>
              Back to the course overview
            </span>
            <ChevronRight size={18} />
          </a>
        )}
      </nav>
    </article>
  );
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

const DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** "In this lesson": section headings plus exercises, collapsed by default on long lessons. */
function Contents({ lesson, state }) {
  const items = [];
  let exNum = 0;
  let h = 0;
  const headings = lesson.headings || [];
  // Walk blocks in order so exercises appear between the sections they follow.
  for (const b of lesson.blocks) {
    if (b.kind === 'prose') {
      const count = splitFences(b.md)
        .filter((p) => p.type === 'text')
        .reduce((n, p) => n + (p.text.match(/^##\s+/gm) || []).length, 0);
      for (let k = 0; k < count && h < headings.length; k++, h++) items.push({ kind: 'h', ...headings[h] });
    } else if (b.kind === 'exercise') {
      exNum++;
      items.push({ kind: 'ex', id: `ex-${b.id}`, text: b.title, n: exNum, difficulty: b.difficulty, done: Boolean(state.done[b.id]) });
    }
  }
  if (items.length < 4) return null;
  return (
    <details className="toc">
      <summary>
        <ListTree size={15} aria-hidden="true" /> In this lesson
        <span className="muted">
          {' '}
          · {headings.length} sections, {lesson.exercises.length} exercises
        </span>
      </summary>
      <ol>
        {items.map((it) => (
          <li key={it.id} className={it.kind}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                scrollToId(it.id);
              }}
            >
              {it.kind === 'ex' ? (
                <>
                  {it.done ? <CircleCheck size={13} className="ok" aria-label="passed" /> : <span className={`dot ${it.difficulty || ''}`} aria-hidden="true" />}
                  Exercise {it.n}: {it.text}
                </>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: renderInline(it.text) }} />
              )}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Prose({ md }) {
  const html = useMemo(() => renderMarkdown(md), [md]);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

function ExerciseCard({ ex, n, done, active, onOpen }) {
  const html = useMemo(() => renderMarkdown(ex.prompt), [ex.prompt]);
  const sample = ex.tests.find((t) => !t.hidden);
  return (
    <section className={`exercise-card${done ? ' done' : ''}${active ? ' active' : ''}`} id={`ex-${ex.id}`}>
      <header>
        <span className="ex-label">Exercise {n}</span>
        <h3>{ex.title}</h3>
        {ex.difficulty && <span className={`diff-badge ${ex.difficulty}`}>{DIFF_LABEL[ex.difficulty]}</span>}
        {done && (
          <span className="badge ok">
            <CircleCheck size={13} /> Passed
          </span>
        )}
      </header>
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      {sample && (sample.stdin || sample.expected) && (
        <div className="sample">
          {sample.stdin && (
            <div>
              <span className="io-label">Example input</span>
              <pre>{sample.stdin}</pre>
            </div>
          )}
          <div>
            <span className="io-label">Expected output</span>
            <pre>{sample.expected}</pre>
          </div>
        </div>
      )}
      <div className="ex-actions">
        <button className="btn primary" onClick={onOpen}>
          <Code2 size={15} aria-hidden="true" /> {active ? 'Open in editor ✓' : 'Open in editor'}
        </button>
        <span className="muted small">
          {ex.tests.length} test{ex.tests.length === 1 ? '' : 's'}
          {ex.tests.some((t) => t.hidden) ? ` (${ex.tests.filter((t) => t.hidden).length} hidden)` : ''}
        </span>
      </div>
    </section>
  );
}

function Quiz({ quiz }) {
  const saved = useStore((s) => s.quiz[quiz.id]);
  const multi = quiz.options.filter((o) => o.correct).length > 1;
  const [picked, setPicked] = useState([]);
  const questionHtml = useMemo(() => renderMarkdown(quiz.question), [quiz.question]);
  const explanationHtml = useMemo(() => renderMarkdown(quiz.explanation), [quiz.explanation]);
  const answered = Boolean(saved);
  const selected = answered ? saved.selected : picked;

  const submit = (sel) => {
    const correctSet = quiz.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0);
    const correct = sel.length === correctSet.length && sel.every((i) => correctSet.includes(i));
    setQuiz(quiz.id, { selected: sel, correct });
  };

  const choose = (i) => {
    if (answered) return;
    if (!multi) return submit([i]);
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  };

  return (
    <section className={`quiz${answered ? (saved.correct ? ' correct' : ' wrong') : ''}`}>
      <div className="quiz-label">Quick check{multi ? ' · select all that apply' : ''}</div>
      <div className="prose" dangerouslySetInnerHTML={{ __html: questionHtml }} />
      <div className="options">
        {quiz.options.map((o, i) => {
          const isSel = selected.includes(i);
          let cls = 'option';
          if (isSel) cls += ' selected';
          if (answered && o.correct) cls += ' right';
          if (answered && isSel && !o.correct) cls += ' wrongpick';
          return (
            <button key={i} className={cls} onClick={() => choose(i)} disabled={answered}>
              <span className={`marker${multi ? ' square' : ''}`}>{answered && o.correct ? '✓' : answered && isSel ? '✗' : isSel ? '•' : ''}</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(o.text) }} />
            </button>
          );
        })}
      </div>
      {multi && !answered && (
        <button className="btn primary" disabled={!picked.length} onClick={() => submit(picked)}>
          Submit answer
        </button>
      )}
      {answered && (
        <div className="quiz-result">
          <div className={`status ${saved.correct ? 'good' : 'bad'}`}>
            {saved.correct ? <CircleCheck size={16} /> : <CircleX size={16} />} {saved.correct ? 'Correct!' : 'Not quite.'}
          </div>
          {quiz.explanation && <div className="prose small" dangerouslySetInnerHTML={{ __html: explanationHtml }} />}
          <button
            className="btn ghost"
            onClick={() => {
              clearQuiz(quiz.id);
              setPicked([]);
            }}
          >
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
