import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, Upload, Trash2, Terminal, BookOpen, Trophy, ListChecks } from 'lucide-react';
import { course, lessonById, totals } from '../lib/content.js';
import { useStore, moduleProgress, setSettings, exportProgress, importProgress, resetProgress, DEFAULT_SETTINGS } from '../lib/store.js';
import { lessonHref } from '../lib/router.js';
import { GODBOLT_COMPILERS, STANDARDS, runCode } from '../lib/runner.js';
import Ide from './Ide.jsx';

export function Home() {
  const state = useStore();
  useEffect(() => {
    document.title = 'skill::issue · Learn C++';
  }, []);
  const doneEx = course.lessons.reduce((n, l) => n + l.exercises.filter((e) => state.done[e.id]).length, 0);
  const doneQuiz = course.lessons.reduce((n, l) => n + l.quizzes.filter((q) => state.quiz[q.id]?.correct).length, 0);
  const resume = (state.last && lessonById.get(state.last)) || course.lessons[0];
  const started = Object.keys(state.visited).length > 0;
  const pct = totals.exercises + totals.quizzes ? Math.round(((doneEx + doneQuiz) / (totals.exercises + totals.quizzes)) * 100) : 0;

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Interactive C++ · zero to hero</p>
          <h1>
            Learn C++ by <span className="accent">writing</span> C++.
          </h1>
          <p className="lead">
            {course.modules.length} modules, {totals.lessons} lessons, {totals.exercises} auto-graded exercises and {totals.quizzes} quizzes, covering everything from{' '}
            <code>int main()</code> to templates, move semantics, and concurrency. Every exercise is compiled with a real GCC and checked against tests.
          </p>
          <div className="hero-actions">
            {resume && (
              <a className="btn primary lg" href={lessonHref(resume)}>
                {started ? 'Continue' : 'Start learning'} <ArrowRight size={17} />
              </a>
            )}
            <a className="btn lg" href="#/playground">
              <Terminal size={17} /> Open playground
            </a>
          </div>
          {started && resume && (
            <p className="muted resume-note">
              Up next: <a href={lessonHref(resume)}>{resume.moduleTitle} → {resume.title}</a>
            </p>
          )}
        </div>
        <div className="hero-stats">
          <Stat icon={<Trophy size={18} />} value={`${pct}%`} label="course complete" />
          <Stat icon={<ListChecks size={18} />} value={`${doneEx}/${totals.exercises}`} label="exercises passed" />
          <Stat icon={<BookOpen size={18} />} value={`${doneQuiz}/${totals.quizzes}`} label="quizzes correct" />
          <div className="progress big">
            <div style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <section className="modules-grid">
        {course.modules.map((mod) => {
          const p = moduleProgress(mod, state);
          const pc = p.total ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <a key={mod.slug} className={`module-card${p.lessons && p.lessonsDone === p.lessons ? ' complete' : ''}`} href={lessonHref(mod.lessons[0])}>
              <div className="module-card-top">
                <span className="mod-num">{String(mod.index).padStart(2, '0')}</span>
                <span className="muted">
                  {p.lessonsDone}/{p.lessons} lessons
                </span>
              </div>
              <h3>{mod.title}</h3>
              <p>{mod.description}</p>
              <div className="progress">
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
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

const PLAYGROUND_TEMPLATE = `#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> langs{"C", "C++", "Rust"};
    for (const auto& lang : langs) {
        std::cout << "Hello, " << lang << "!\\n";
    }
}
`;

export function Playground() {
  useEffect(() => {
    document.title = 'Playground · skill::issue';
  }, []);
  return (
    <div className="playground">
      <div className="playground-head">
        <h1>Playground</h1>
        <p className="muted">A free-form scratchpad. Your code is saved automatically in this browser. Put program input in the Input (stdin) tab.</p>
      </div>
      <div className="playground-ide">
        <Ide tabs={[{ key: 'playground', label: 'Playground', template: PLAYGROUND_TEMPLATE }]} activeKey="playground" onSelect={() => {}} />
      </div>
    </div>
  );
}

export function Settings() {
  const state = useStore();
  const s = state.settings;
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    document.title = 'Settings · skill::issue';
  }, []);

  const doExport = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `skill-issue-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (file) => {
    try {
      importProgress(await file.text());
      setMsg('Progress imported.');
    } catch (e) {
      setMsg(`Import failed: ${e.message}`);
    }
  };
  const testCompiler = async () => {
    setTesting(true);
    setMsg('');
    const r = await runCode('#include <iostream>\nint main(){ std::cout << __VERSION__; }', '', s);
    setTesting(false);
    setMsg(r.error ? `✗ ${r.error}` : r.compiled ? `✓ Working. Compiler version: ${r.stdout}` : `✗ Compile failed: ${r.compileOutput}`);
  };

  return (
    <div className="settings">
      <h1>Settings</h1>

      <section className="card">
        <h2>Compiler</h2>
        <p className="muted">
          Code is compiled and run by a free public service, straight from your browser. No account or server of your own is needed. Your code is sent to that service to be
          compiled.
        </p>
        <label className="field">
          <span>Service</span>
          <select value={s.backend} onChange={(e) => setSettings({ backend: e.target.value })}>
            <option value="godbolt">Compiler Explorer (godbolt.org), recommended</option>
            <option value="wandbox">Wandbox (wandbox.org), fallback</option>
          </select>
        </label>
        {s.backend === 'godbolt' && (
          <label className="field">
            <span>Compiler</span>
            <select value={s.compiler} onChange={(e) => setSettings({ compiler: e.target.value })}>
              {GODBOLT_COMPILERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>C++ standard</span>
          <select value={s.std} onChange={(e) => setSettings({ std: e.target.value })}>
            {STANDARDS.map((x) => (
              <option key={x} value={x}>
                {x.toUpperCase().replace('C++', 'C++ ')}
              </option>
            ))}
          </select>
        </label>
        <label className="field check">
          <input type="checkbox" checked={s.sanitizers} onChange={(e) => setSettings({ sanitizers: e.target.checked })} />
          <span>
            <strong>Sanitizers</strong> (<code>-fsanitize=address,undefined</code>): catch out-of-bounds access, use-after-free, signed overflow and other undefined behavior at
            runtime. Slower, but great for learning.
          </span>
        </label>
        <button className="btn" onClick={testCompiler} disabled={testing}>
          {testing ? 'Testing…' : 'Test connection'}
        </button>
      </section>

      <section className="card">
        <h2>Editor</h2>
        <label className="field">
          <span>Font size</span>
          <input type="range" min="11" max="22" value={s.fontSize} onChange={(e) => setSettings({ fontSize: Number(e.target.value) })} />
          <span className="muted">{s.fontSize}px</span>
        </label>
        <label className="field">
          <span>Theme</span>
          <select value={s.theme} onChange={(e) => setSettings({ theme: e.target.value })}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <button className="btn ghost" onClick={() => setSettings(DEFAULT_SETTINGS)}>
          Restore default settings
        </button>
      </section>

      <section className="card">
        <h2>Your progress</h2>
        <p className="muted">
          Progress and code are stored only in this browser's localStorage. Export a backup now and then, or to move to another device.
        </p>
        <div className="row">
          <button className="btn" onClick={doExport}>
            <Download size={15} /> Export progress
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import progress
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files[0] && doImport(e.target.files[0])} />
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm('Erase ALL progress and saved code? This cannot be undone (unless you exported a backup).')) {
                resetProgress();
                setMsg('Progress reset.');
              }
            }}
          >
            <Trash2 size={15} /> Reset everything
          </button>
        </div>
      </section>
      {msg && <p className="settings-msg">{msg}</p>}
    </div>
  );
}
