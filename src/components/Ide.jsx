import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Play, CheckCheck, Lightbulb, KeyRound, RotateCcw, Loader2, CircleCheck, CircleX, Copy, Square } from 'lucide-react';
import CodeEditor from './CodeEditor.jsx';
import { useStore, setCode, setStdin, markDone, revealHint, getState } from '../lib/store.js';
import { runCode, checkExercise, GODBOLT_COMPILERS } from '../lib/runner.js';
import { renderMarkdown, highlight } from '../lib/markdown.js';
import { normalizeOutput } from '../lib/parse.js';

export const SCRATCH_TEMPLATE = `#include <iostream>

int main() {
    std::cout << "Hello from the scratchpad!\\n";
}
`;

function defaultCode(tab) {
  return tab.exercise ? tab.exercise.starter : tab.template || SCRATCH_TEMPLATE;
}

/**
 * tabs: [{ key, label, exercise?, template? }]
 * Exposes ref.loadAndRun(key, code) for "▶ Run" buttons in lessons.
 */
const Ide = forwardRef(function Ide({ tabs, activeKey, onSelect, showPrompt = true }, ref) {
  const state = useStore();
  const { settings } = state;
  const tab = tabs.find((t) => t.key === activeKey) || tabs[0];
  const ex = tab.exercise;
  const code = state.code[tab.key] ?? defaultCode(tab);
  const stdin = state.stdin[tab.key] ?? (ex?.tests[0]?.stdin || '');

  const [results, setResults] = useState({}); // tab key -> { kind, running, data, progress }
  const [panelState, setPanel] = useState('output');
  const panel = !ex && ['tests', 'hints', 'solution'].includes(panelState) ? 'output' : panelState;
  const [promptOpenKey, setPromptOpenKey] = useState(null);
  const promptOpen = promptOpenKey === tab.key;
  const setPromptOpen = (fn) => setPromptOpenKey(fn(promptOpen) ? tab.key : null);
  const [solutionShown, setSolutionShown] = useState({});
  const aborts = useRef({});
  const result = results[tab.key];
  const running = Boolean(result?.running);

  const setResult = (key, value) => setResults((r) => ({ ...r, [key]: value }));

  const doRun = useCallback(
    async (key = tab.key, source, input) => {
      const s = getState();
      const t = tabs.find((x) => x.key === key) || tab;
      source ??= s.code[key] ?? defaultCode(t);
      input ??= s.stdin[key] ?? (t.exercise?.tests[0]?.stdin || '');
      aborts.current[key]?.abort();
      const ac = new AbortController();
      aborts.current[key] = ac;
      setPanel('output');
      setResult(key, { kind: 'run', running: true });
      const data = await runCode(source, input, s.settings, ac.signal);
      if (data.aborted) return;
      setResult(key, { kind: 'run', running: false, data });
    },
    [tab, tabs],
  );

  const doCheck = useCallback(async () => {
    if (!ex) return doRun();
    const key = tab.key;
    const s = getState();
    const source = s.code[key] ?? defaultCode(tab);
    aborts.current[key]?.abort();
    const ac = new AbortController();
    aborts.current[key] = ac;
    setPanel('tests');
    setResult(key, { kind: 'check', running: true, progress: { tests: ex.tests.map(() => null), checkFailures: [] } });
    const data = await checkExercise(ex, source, s.settings, (progress) => setResult(key, { kind: 'check', running: true, progress }), ac.signal);
    if (data.aborted) return;
    if (data.passed) markDone(ex.id);
    setResult(key, { kind: 'check', running: false, data });
  }, [ex, tab, doRun]);

  const stop = () => {
    aborts.current[tab.key]?.abort();
    setResult(tab.key, undefined);
  };

  useImperativeHandle(ref, () => ({
    loadAndRun(key, source) {
      setCode(key, source);
      setStdin(key, '');
      onSelect(key);
      doRun(key, source, '');
    },
  }));

  const reset = () => {
    if (code !== defaultCode(tab) && !window.confirm('Replace your code with the starter code? Your changes will be lost.')) return;
    setCode(tab.key, defaultCode(tab));
  };

  const hintsShown = ex ? state.hints[ex.id] || 0 : 0;
  const showHint = () => {
    if (hintsShown < ex.hints.length) revealHint(ex.id);
    setPanel('hints');
  };
  const showSolution = () => {
    if (!solutionShown[tab.key] && !state.done[ex.id] && !window.confirm('Peek at the solution? Struggling a bit first is how it sticks.')) return;
    setSolutionShown((s) => ({ ...s, [tab.key]: true }));
    setPanel('solution');
  };

  const compilerLabel =
    settings.backend === 'wandbox' ? 'GCC 13.2 · Wandbox' : `${GODBOLT_COMPILERS.find((c) => c.id === settings.compiler)?.label || settings.compiler} · Compiler Explorer`;

  return (
    <div className="ide">
      {tabs.length > 1 && (
        <div className="ide-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={t.key === tab.key} className={`ide-tab${t.key === tab.key ? ' active' : ''}`} onClick={() => onSelect(t.key)}>
              {t.exercise && (state.done[t.exercise.id] ? <CircleCheck size={14} className="ok" /> : <span className="dot" />)}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {ex && showPrompt && (
        <div className={`ide-prompt${promptOpen ? ' open' : ''}`}>
          <button className="ide-prompt-toggle" onClick={() => setPromptOpen((o) => !o)}>
            <strong>{ex.title}</strong>
            {state.done[ex.id] && <span className="badge ok">Passed</span>}
            <span className="muted">{promptOpen ? 'Hide task ▴' : 'Show task ▾'}</span>
          </button>
          {promptOpen && <div className="prose small" dangerouslySetInnerHTML={{ __html: renderMarkdown(ex.prompt) }} />}
        </div>
      )}

      <div className="ide-editor">
        <CodeEditor value={code} onChange={(v) => setCode(tab.key, v)} onRun={() => doRun()} onCheck={doCheck} fontSize={settings.fontSize} theme={settings.theme} />
      </div>

      <div className="ide-toolbar">
        {running ? (
          <button className="btn" onClick={stop}>
            <Square size={15} /> Stop
          </button>
        ) : (
          <button className="btn primary" onClick={() => doRun()} title="Compile & run (Ctrl/⌘ + Enter)">
            <Play size={15} /> Run
          </button>
        )}
        {ex && (
          <button className="btn success" onClick={doCheck} disabled={running} title="Run all tests (Ctrl/⌘ + Shift + Enter)">
            <CheckCheck size={15} /> Check
          </button>
        )}
        {ex && ex.hints.length > 0 && (
          <button className="btn ghost" onClick={showHint}>
            <Lightbulb size={15} /> <span className="lbl">Hint</span> {hintsShown ? `${Math.min(hintsShown, ex.hints.length)}/${ex.hints.length}` : ''}
          </button>
        )}
        {ex && (
          <button className="btn ghost" onClick={showSolution}>
            <KeyRound size={15} /> <span className="lbl">Solution</span>
          </button>
        )}
        <button className="btn ghost icon" onClick={reset} title={ex ? 'Reset to starter code' : 'Reset scratchpad'}>
          <RotateCcw size={15} />
        </button>
        <span className="compiler-label" title="Change in Settings">
          {compilerLabel} · {settings.std}
        </span>
      </div>

      <div className="ide-bottom">
        <div className="panel-tabs">
          <PanelTab id="output" panel={panel} setPanel={setPanel}>
            Output
          </PanelTab>
          <PanelTab id="input" panel={panel} setPanel={setPanel}>
            Input (stdin){stdin.trim() ? ' •' : ''}
          </PanelTab>
          {ex && (
            <PanelTab id="tests" panel={panel} setPanel={setPanel}>
              Tests
            </PanelTab>
          )}
          {ex && hintsShown > 0 && (
            <PanelTab id="hints" panel={panel} setPanel={setPanel}>
              Hints
            </PanelTab>
          )}
          {ex && solutionShown[tab.key] && (
            <PanelTab id="solution" panel={panel} setPanel={setPanel}>
              Solution
            </PanelTab>
          )}
        </div>
        <div className="panel-body">
          {panel === 'output' && <OutputPanel result={result} />}
          {panel === 'input' && (
            <div className="stdin-panel">
              <textarea
                value={stdin}
                spellCheck={false}
                placeholder="Text typed here is fed to your program's std::cin when you press Run."
                onChange={(e) => setStdin(tab.key, e.target.value)}
              />
            </div>
          )}
          {panel === 'tests' && ex && <TestsPanel ex={ex} result={result} />}
          {panel === 'hints' && ex && (
            <div className="hints">
              {ex.hints.slice(0, hintsShown).map((h, i) => (
                <div key={i} className="hint">
                  <span className="hint-n">Hint {i + 1}</span>
                  <div className="prose small" dangerouslySetInnerHTML={{ __html: renderMarkdown(h) }} />
                </div>
              ))}
              {hintsShown < ex.hints.length ? (
                <button className="btn ghost" onClick={showHint}>
                  <Lightbulb size={15} /> Show next hint
                </button>
              ) : (
                <p className="muted">That's all the hints. Still stuck? Peek at the solution.</p>
              )}
            </div>
          )}
          {panel === 'solution' && ex && (
            <div className="solution">
              <div className="solution-bar">
                <span className="muted">Reference solution. Yours can differ and still be correct.</span>
                <button
                  className="btn ghost"
                  onClick={() => {
                    if (window.confirm('Replace your code with the solution?')) setCode(tab.key, ex.solution);
                  }}
                >
                  <Copy size={14} /> Load into editor
                </button>
              </div>
              <pre className="hljs">
                <code dangerouslySetInnerHTML={{ __html: highlight(ex.solution) }} />
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default Ide;

function PanelTab({ id, panel, setPanel, children }) {
  return (
    <button className={`panel-tab${panel === id ? ' active' : ''}`} onClick={() => setPanel(id)}>
      {children}
    </button>
  );
}

function Running({ label = 'Compiling & running…' }) {
  return (
    <div className="running">
      <Loader2 size={16} className="spin" /> {label}
    </div>
  );
}

function OutputPanel({ result }) {
  if (!result) return <p className="muted pad">Press Run (Ctrl/⌘ + Enter) to compile and run your program.</p>;
  if (result.running && result.kind === 'run') return <Running />;
  const d = result.kind === 'run' ? result.data : null;
  if (!d) return <p className="muted pad">See the Tests tab for check results.</p>;
  return <ExecResult d={d} />;
}

function ExecResult({ d }) {
  if (d.error) return <div className="console error-text">{d.error}</div>;
  if (!d.compiled)
    return (
      <div className="console">
        <div className="status bad">
          <CircleX size={15} /> Compilation failed
        </div>
        <pre className="compile-output">{d.compileOutput}</pre>
      </div>
    );
  const exitOk = d.exitCode === 0;
  return (
    <div className="console">
      {d.compileOutput?.trim() && (
        <details className="warnings">
          <summary>⚠ Compiler warnings</summary>
          <pre>{d.compileOutput}</pre>
        </details>
      )}
      <pre className="stdout">{d.stdout || <span className="muted">(no output)</span>}</pre>
      {d.stderr?.trim() && <pre className="stderr">{d.stderr}</pre>}
      <div className={`exit ${exitOk ? '' : 'bad'}`}>
        {d.timedOut ? 'Timed out (infinite loop? waiting for input?)' : d.signal ? `Killed by ${d.signal}` : `Exited with code ${d.exitCode}`}
        {d.truncated && ' · output truncated'}
        {d.wallTime ? ` · ${(d.wallTime / 1000).toFixed(1)}s round trip` : ''}
      </div>
    </div>
  );
}

function firstDiff(got, want) {
  const a = normalizeOutput(got).split('\n');
  const b = normalizeOutput(want).split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return { line: i + 1, got: a[i], want: b[i] };
  }
  return null;
}

function TestsPanel({ ex, result }) {
  if (!result || result.kind !== 'check') return <p className="muted pad">Press Check (Ctrl/⌘ + Shift + Enter) to run your code against {ex.tests.length} test{ex.tests.length === 1 ? '' : 's'}.</p>;
  const d = result.running ? result.progress : result.data;
  if (d.error) return <div className="console error-text">{d.error}</div>;
  if (d.compileError)
    return (
      <div className="console">
        <div className="status bad">
          <CircleX size={15} /> Compilation failed
        </div>
        <pre className="compile-output">{d.compileError}</pre>
      </div>
    );
  const tests = d.tests || [];
  const passedCount = tests.filter((t) => t?.pass).length;
  return (
    <div className="tests">
      {result.running ? (
        <Running label={`Running tests… ${tests.filter(Boolean).length}/${ex.tests.length}`} />
      ) : d.passed ? (
        <div className="status good big">
          <CircleCheck size={18} /> {tests.length === 1 ? 'Test passed' : `All ${tests.length} tests passed`}. Nice work!
        </div>
      ) : (
        <div className="status bad">
          <CircleX size={15} /> {passedCount}/{tests.length} tests passed{d.checkFailures?.length ? ', and some requirements are not met' : ''}
        </div>
      )}
      {d.checkFailures?.length > 0 && (
        <ul className="check-failures">
          {d.checkFailures.map((f) => (
            <li key={f}>✗ {f}</li>
          ))}
        </ul>
      )}
      {tests.map((t, i) =>
        !t ? (
          <div key={i} className="test pending">
            Test {i + 1} <span className="muted">…</span>
          </div>
        ) : (
          <details key={i} className={`test ${t.pass ? 'pass' : 'fail'}`} open={!t.pass && tests.findIndex((x) => x && !x.pass) === i}>
            <summary>
              {t.pass ? <CircleCheck size={14} /> : <CircleX size={14} />} Test {i + 1}
              {t.hidden && <span className="muted"> (hidden)</span>}
              {!t.pass && t.timedOut && <span className="muted"> timed out</span>}
              {!t.pass && t.outputMatches && !t.timedOut && <span className="muted"> output OK, but exit code {t.exitCode}</span>}
            </summary>
            {t.error ? (
              <div className="error-text">{t.error}</div>
            ) : (
              <div className="test-io">
                <IoBlock label="Input" text={t.stdin} empty="(no input)" />
                {t.hidden && !t.pass ? <IoBlock label="Expected" text="(hidden: think about edge cases)" /> : <IoBlock label="Expected" text={t.expected} />}
                <IoBlock label="Your output" text={t.stdout} empty="(no output)" />
                {t.stderr?.trim() && <IoBlock label="stderr" text={t.stderr} />}
                {!t.pass && !(t.hidden && !t.pass) && (() => {
                  const diff = firstDiff(t.stdout, t.expected);
                  return diff ? (
                    <p className="diff">
                      First difference on line {diff.line}: expected <code>{JSON.stringify(diff.want ?? '(nothing)')}</code>, got <code>{JSON.stringify(diff.got ?? '(nothing)')}</code>
                    </p>
                  ) : null;
                })()}
              </div>
            )}
          </details>
        ),
      )}
    </div>
  );
}

function IoBlock({ label, text, empty = '' }) {
  return (
    <div className="io">
      <span className="io-label">{label}</span>
      <pre>{text?.length ? text : <span className="muted">{empty}</span>}</pre>
    </div>
  );
}
