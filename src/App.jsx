import { useEffect, useState } from 'react';
import { Menu, Search, Settings as SettingsIcon, Terminal, X, Sun, Moon } from 'lucide-react';
import { useHash, parseRoute } from './lib/router.js';
import { lessonById, course, totals } from './lib/content.js';
import { useStore, setSettings } from './lib/store.js';
import Sidebar from './components/Sidebar.jsx';
import LessonPage from './components/LessonPage.jsx';
import SearchDialog from './components/SearchDialog.jsx';
import { Home, Playground, Settings } from './components/Pages.jsx';

export default function App() {
  const route = parseRoute(useHash());
  const state = useStore();
  const theme = state.settings.theme;
  const routeKey = `${route.page}:${route.lessonId || ''}`;
  const [drawerRoute, setDrawerRoute] = useState(null);
  const drawer = drawerRoute === routeKey;
  const setDrawer = (open) => setDrawerRoute((typeof open === 'function' ? open(drawer) : open) ? routeKey : null);
  const [search, setSearch] = useState(false);
  const lesson = route.page === 'lesson' ? lessonById.get(route.lessonId) : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doneCount =
    course.lessons.reduce((n, l) => n + l.exercises.filter((e) => state.done[e.id]).length + l.quizzes.filter((q) => state.quiz[q.id]?.correct).length, 0) || 0;
  const pct = totals.exercises + totals.quizzes ? (doneCount / (totals.exercises + totals.quizzes)) * 100 : 0;
  const withSidebar = route.page === 'lesson';

  let main;
  if (route.page === 'lesson') {
    main = lesson ? (
      <LessonPage key={lesson.id} lesson={lesson} />
    ) : (
      <div className="notfound">
        <h1>Lesson not found</h1>
        <p>
          <a href="#/">Back to the course</a>
        </p>
      </div>
    );
  } else if (route.page === 'playground') main = <Playground />;
  else if (route.page === 'settings') main = <Settings />;
  else main = <Home />;

  return (
    <div className={`app${withSidebar ? ' with-sidebar' : ''}${drawer ? ' drawer-open' : ''}`}>
      <header className="topbar">
        {withSidebar && (
          <button className="icon-btn drawer-btn" onClick={() => setDrawer((d) => !d)} aria-label="Toggle course contents">
            {drawer ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        <a href="#/" className="brand">
          <span className="brand-mark">::</span>
          <span>
            skill<span className="accent">::</span>issue
          </span>
        </a>
        <div className="top-progress" title={`${Math.round(pct)}% of exercises and quizzes done`}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <nav className="top-nav">
          <button className="search-btn" onClick={() => setSearch(true)}>
            <Search size={15} /> <span>Search</span> <kbd>Ctrl K</kbd>
          </button>
          <a href="#/playground" className={`icon-btn${route.page === 'playground' ? ' active' : ''}`} title="Playground">
            <Terminal size={18} />
          </a>
          <button className="icon-btn" onClick={() => setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a href="#/settings" className={`icon-btn${route.page === 'settings' ? ' active' : ''}`} title="Settings">
            <SettingsIcon size={18} />
          </a>
        </nav>
      </header>
      <div className="body">
        {withSidebar && (
          <>
            <aside className="sidebar-wrap">
              <Sidebar currentLessonId={route.lessonId} onNavigate={() => setDrawer(false)} />
            </aside>
            <div className="drawer-scrim" onClick={() => setDrawer(false)} />
          </>
        )}
        <main className="main">{main}</main>
      </div>
      {search && <SearchDialog onClose={() => setSearch(false)} />}
    </div>
  );
}
