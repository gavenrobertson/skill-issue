import { lazy, Suspense, useEffect, useState } from 'react';
import { Menu, Search, Settings as SettingsIcon, Terminal, X, Sun, Moon, Dumbbell, Keyboard } from 'lucide-react';
import { useHash, parseRoute, lessonHref, go } from './lib/router.js';
import { lessonById, course, totals, neighbors } from './lib/content.js';
import { useStore, setSettings } from './lib/store.js';
import Sidebar from './components/Sidebar.jsx';
import LessonPage from './components/LessonPage.jsx';
import SearchDialog from './components/SearchDialog.jsx';
import ShortcutsDialog from './components/ShortcutsDialog.jsx';
import Home from './pages/Home.jsx';

const Practice = lazy(() => import('./pages/Practice.jsx'));
const Playground = lazy(() => import('./pages/Playground.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest?.('.cm-editor'));

export default function App() {
  const route = parseRoute(useHash());
  const state = useStore();
  const theme = state.settings.theme;
  const routeKey = `${route.page}:${route.lessonId || ''}`;
  const [drawerRoute, setDrawerRoute] = useState(null);
  const drawer = drawerRoute === routeKey;
  const setDrawer = (open) => setDrawerRoute((typeof open === 'function' ? open(drawer) : open) ? routeKey : null);
  const [dialog, setDialog] = useState(null); // 'search' | 'shortcuts' | null
  const lesson = route.page === 'lesson' ? lessonById.get(route.lessonId) : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c0f17' : '#f6f7fb');
  }, [theme]);

  // Move focus to the page content on navigation, for keyboard and screen-reader users.
  useEffect(() => {
    if (route.page !== 'lesson') window.scrollTo?.(0, 0);
  }, [routeKey, route.page]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDialog((d) => (d === 'search' ? null : 'search'));
        return;
      }
      if (isTyping(e.target)) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setDialog((d) => (d === 'shortcuts' ? null : 'shortcuts'));
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setDialog('search');
      } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const id = parseRoute(window.location.hash).lessonId;
        if (!id) return;
        const { prev, next } = neighbors(id);
        const target = e.key === 'ArrowLeft' ? prev : next;
        if (target) {
          e.preventDefault();
          go(lessonHref(target));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doneCount = course.lessons.reduce((n, l) => n + l.exercises.filter((e) => state.done[e.id]).length + l.quizzes.filter((q) => state.quiz[q.id]?.correct).length, 0);
  const pct = totals.exercises + totals.quizzes ? (doneCount / (totals.exercises + totals.quizzes)) * 100 : 0;
  const withSidebar = route.page === 'lesson';

  let main;
  if (route.page === 'lesson') {
    main = lesson ? (
      <LessonPage key={lesson.id} meta={lesson} initialExercise={route.exercise} />
    ) : (
      <div className="notfound">
        <h1>Lesson not found</h1>
        <p className="muted">It may have been renamed. Try searching for it.</p>
        <p>
          <a href="#/">Back to the course</a>
        </p>
      </div>
    );
  } else if (route.page === 'practice') main = <Practice key={route.filter || 'all'} filter={route.filter} />;
  else if (route.page === 'playground') main = <Playground />;
  else if (route.page === 'settings') main = <Settings />;
  else main = <Home />;

  return (
    <div className={`app${withSidebar ? ' with-sidebar' : ''}${drawer ? ' drawer-open' : ''}`}>
      <a href="#main" className="skip-link" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>
      <header className="topbar">
        {withSidebar && (
          <button
            className="icon-btn drawer-btn"
            onClick={() => setDrawer((d) => !d)}
            aria-label={drawer ? 'Close course contents' : 'Open course contents'}
            aria-expanded={drawer}
          >
            {drawer ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        <a href="#/" className="brand" aria-label="skill::issue home">
          <span className="brand-mark" aria-hidden="true">
            ::
          </span>
          <span>
            skill<span className="accent">::</span>issue
          </span>
        </a>
        <div
          className="top-progress"
          role="progressbar"
          aria-label="Course progress"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          title={`${Math.round(pct)}% of exercises and quizzes done`}
        >
          <div style={{ width: `${pct}%` }} />
        </div>
        <nav className="top-nav" aria-label="Main">
          <button className="search-btn" onClick={() => setDialog('search')} aria-label="Search lessons">
            <Search size={15} aria-hidden="true" /> <span>Search</span> <kbd>Ctrl K</kbd>
          </button>
          <a href="#/practice" className={`icon-btn${route.page === 'practice' ? ' active' : ''}`} title="Practice" aria-label="Practice">
            <Dumbbell size={18} aria-hidden="true" />
          </a>
          <a href="#/playground" className={`icon-btn${route.page === 'playground' ? ' active' : ''}`} title="Playground" aria-label="Playground">
            <Terminal size={18} aria-hidden="true" />
          </a>
          <button className="icon-btn hide-narrow" onClick={() => setDialog('shortcuts')} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
            <Keyboard size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-btn"
            onClick={() => setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
            title="Toggle theme"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <a href="#/settings" className={`icon-btn${route.page === 'settings' ? ' active' : ''}`} title="Settings" aria-label="Settings">
            <SettingsIcon size={18} aria-hidden="true" />
          </a>
        </nav>
      </header>
      <div className="body">
        {withSidebar && (
          <>
            <aside className="sidebar-wrap" aria-label="Course contents">
              <Sidebar currentLessonId={route.lessonId} onNavigate={() => setDrawer(false)} />
            </aside>
            <div className="drawer-scrim" onClick={() => setDrawer(false)} />
          </>
        )}
        <main className="main" id="main" tabIndex={-1}>
          <Suspense fallback={<p className="muted pad">Loading…</p>}>{main}</Suspense>
        </main>
      </div>
      {dialog === 'search' && <SearchDialog onClose={() => setDialog(null)} />}
      {dialog === 'shortcuts' && <ShortcutsDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
