import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BookOpen, Code2 } from 'lucide-react';
import Lesson from './Lesson.jsx';
import { visit } from '../lib/store.js';
import { loadLesson, neighbors } from '../lib/content.js';
import { lessonHref, go } from '../lib/router.js';

const Ide = lazy(() => import('./Ide.jsx'));
const SPLIT_KEY = 'skill-issue:split';

function readSplit() {
  try {
    return Number(localStorage.getItem(SPLIT_KEY)) || 50;
  } catch {
    return 50;
  }
}

export function IdeFallback() {
  return (
    <div className="ide ide-loading" aria-busy="true">
      <div className="skeleton" style={{ height: 38 }} />
      <div className="skeleton grow" />
      <p className="muted pad">Loading editor…</p>
    </div>
  );
}

/** Loads the full lesson for `meta` (index entry) and renders lesson + IDE side by side. */
export default function LessonPage({ meta, initialExercise }) {
  const [loaded, setLoaded] = useState(null); // { id, lesson } | { id, error }
  useEffect(() => {
    let alive = true;
    loadLesson(meta.id).then(
      (lesson) => alive && setLoaded({ id: meta.id, lesson }),
      (error) => alive && setLoaded({ id: meta.id, error }),
    );
    visit(meta.id);
    document.title = `${meta.title} · skill::issue`;
    // Warm the cache for the next lesson so "Next" feels instant.
    const { next } = neighbors(meta.id);
    if (next) setTimeout(() => loadLesson(next.id).catch(() => {}), 1500);
    return () => {
      alive = false;
    };
  }, [meta]);

  if (loaded?.error)
    return (
      <div className="notfound">
        <h1>Couldn't load this lesson</h1>
        <p className="muted">{String(loaded.error.message || loaded.error)}. If the site was just updated, reload the page.</p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  if (!loaded || loaded.id !== meta.id) return <LessonSkeleton meta={meta} />;
  return <LessonWorkspace lesson={loaded.lesson} initialExercise={initialExercise} />;
}

function LessonSkeleton({ meta }) {
  return (
    <div className="lesson-page" aria-busy="true">
      <div className="lesson-scroll">
        <article className="lesson">
          <header className="lesson-header">
            <div className="eyebrow">
              Module {meta.moduleIndex} · {meta.moduleTitle} · Lesson {meta.index}
            </div>
            <h1>{meta.title}</h1>
            {meta.summary && <p className="lead">{meta.summary}</p>}
          </header>
          <div className="skeleton line" />
          <div className="skeleton line short" />
          <div className="skeleton block" />
        </article>
      </div>
      <div className="split-handle" />
      <div className="ide-pane">
        <IdeFallback />
      </div>
    </div>
  );
}

function LessonWorkspace({ lesson, initialExercise }) {
  const ideRef = useRef(null);
  const scrollRef = useRef(null);
  const [exampleOpen, setExampleOpen] = useState(false);
  const tabs = [
    ...lesson.exercises.map((ex, i) => ({ key: ex.id, label: `Ex ${i + 1}`, title: ex.title, exercise: ex })),
    ...(exampleOpen ? [{ key: 'example', label: 'Example', title: 'The last example you ran from this lesson' }] : []),
    { key: 'scratch', label: 'Scratch', title: 'Your own scratchpad (kept between lessons)' },
  ];
  const linked = initialExercise && lesson.exercises.find((e) => e.id === `${lesson.id}/${initialExercise}`);
  const [activeKey, setActiveKey] = useState(linked ? linked.id : tabs[0].key);
  const [mobileView, setMobileView] = useState(linked ? 'code' : 'lesson');

  // Arriving from a link to a specific exercise: bring its card into view.
  useEffect(() => {
    if (linked) document.getElementById(`ex-${linked.id}`)?.scrollIntoView({ block: 'start' });
  }, [linked]);
  const [split, setSplit] = useState(readSplit);

  const openExercise = (key) => {
    setActiveKey(key);
    setMobileView('code');
  };

  // After passing an exercise: go to the next one in this lesson, else the next lesson.
  const getNext = (key) => {
    const i = lesson.exercises.findIndex((e) => e.id === key);
    const nextEx = lesson.exercises[i + 1];
    if (nextEx)
      return {
        label: `Next: Exercise ${i + 2}`,
        run: () => {
          openExercise(nextEx.id);
          document.getElementById(`ex-${nextEx.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      };
    const { next } = neighbors(lesson.id);
    return next ? { label: `Next lesson: ${next.title}`, run: () => go(lessonHref(next)) } : { label: 'Back to the course overview', run: () => go('#/') };
  };

  const resize = (pct) => setSplit(Math.min(72, Math.max(28, pct)));
  const saveSplit = (v) => {
    try {
      localStorage.setItem(SPLIT_KEY, String(Math.round(v)));
    } catch {
      /* ignore */
    }
  };

  const startDrag = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    let last = split;
    const move = (ev) => {
      last = ((ev.clientX - rect.left) / rect.width) * 100;
      resize(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('dragging');
      saveSplit(Math.min(72, Math.max(28, last)));
    };
    document.body.classList.add('dragging');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onHandleKey = (e) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const v = Math.min(72, Math.max(28, split + (e.key === 'ArrowLeft' ? -step : step)));
      setSplit(v);
      saveSplit(v);
    }
  };

  return (
    <div className={`lesson-page show-${mobileView}`} style={{ '--split': `${split}%` }}>
      <div className="lesson-scroll" ref={scrollRef}>
        <Lesson
          lesson={lesson}
          activeKey={activeKey}
          onRunExample={(code) => {
            setExampleOpen(true);
            setMobileView('code');
            // Wait a tick so the Example tab exists before it is selected.
            setTimeout(() => ideRef.current?.loadAndRun('example', code));
          }}
          onOpenExercise={openExercise}
        />
      </div>
      <div
        className="split-handle"
        onPointerDown={startDrag}
        onKeyDown={onHandleKey}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize lesson and editor"
        aria-valuenow={Math.round(split)}
        aria-valuemin={28}
        aria-valuemax={72}
        tabIndex={0}
        title="Drag (or use arrow keys) to resize"
      />
      <div className="ide-pane">
        <Suspense fallback={<IdeFallback />}>
          <Ide ref={ideRef} tabs={tabs} activeKey={activeKey} onSelect={setActiveKey} getNext={getNext} />
        </Suspense>
      </div>
      <nav className="mobile-switch" aria-label="Switch view">
        <button className={mobileView === 'lesson' ? 'active' : ''} aria-pressed={mobileView === 'lesson'} onClick={() => setMobileView('lesson')}>
          <BookOpen size={16} aria-hidden="true" /> Lesson
        </button>
        <button className={mobileView === 'code' ? 'active' : ''} aria-pressed={mobileView === 'code'} onClick={() => setMobileView('code')}>
          <Code2 size={16} aria-hidden="true" /> Code
        </button>
      </nav>
    </div>
  );
}
