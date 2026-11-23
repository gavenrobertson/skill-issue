import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Play, CheckCheck, Lightbulb, KeyRound, RotateCcw, CircleCheck, Copy, Square, Check } from 'lucide-react';
import CodeEditor from './CodeEditor.jsx';
import { Running, ExecResult, TestsPanel } from './IdePanels.jsx';
import { useStore, setCode, setStdin, markDone, revealHint, getState } from '../lib/store.js';
import { runCode, checkExercise, GODBOLT_COMPILERS } from '../lib/runner.js';
import { renderMarkdown, highlight } from '../lib/markdown.js';
import { parseDiagnostics } from '../lib/diagnostics.js';

export const SCRATCH_TEMPLATE = `#include <iostream>

int main() {
    std::cout << "Hello from the scratchpad!\\n";
}
`;

function defaultCode(tab) {
  return tab.exercise ? tab.exercise.starter : tab.template || SCRATCH_TEMPLATE;
}

const DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/**
 * A small IDE: tabs, editor, Run/Check, and output/input/tests/hints/solution panels.
 * tabs: [{ key, label, title?, exercise?, template? }]
 * getNext(key) -> { label, run } | null : what to do after an exercise passes.
 * Exposes ref.loadAndRun(key, code) for "▶ Run" buttons in lessons.
 */
const Ide = forwardRef(function Ide({ tabs, activeKey, onSelect, getNext, showPrompt = true }, ref) {
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
  const [solutionShown, setSolutionShown] = useState({});
  const [confirm, setConfirm] = useState(null); // { message, action, label }
  const aborts = useRef({});
  const viewRef = useRef(null);
  const result = results[tab.key];
  const running = Boolean(result?.running);

  const setResult = (key, value) => setResults((r) => ({ ...r, [key]: value }));

  // Compiler messages for the code as it was compiled; hidden once the code changes.
  const diagnostics = useMemo(() => {
    const d = result?.data;
    if (!d || result.running) return [];
    const text = d.compileError ?? d.compileOutput;
    const compiled = d.source ?? d.tests?.find(Boolean)?.source;
    if (!text || compiled !== code) return [];
    return parseDiagnostics(text);
  }, [result, code]);

  const jumpTo = (line, col = 1) => {
    const view = viewRef.current;
    if (!view || line < 1 || line > view.state.doc.lines) return;
    const l = view.state.doc.line(line);
    const pos = Math.min(l.from + Math.max(0, col - 1), l.to);
    view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
    view.focus();
  };

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
    setResult(key, { kind: 'check', running: false, data: { ...data, source } });
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

  const ask = (message, label, action) => setConfirm({ message, label, action });

  const reset = () => {
    if (code === defaultCode(tab)) return;
    ask(ex ? 'Replace your code with the starter code? Your changes will be lost.' : 'Reset this tab? Your code will be lost.', 'Reset', () => setCode(tab.key, defaultCode(tab)));
  };

  const hintsShown = ex ? state.hints[ex.id] || 0 : 0;
  const showHint = () => {
    if (hintsShown < ex.hints.length) revealHint(ex.id);
    setPanel('hints');
  };
  const revealSolution = () => {
    setSolutionShown((s) => ({ ...s, [tab.key]: true }));
    setPanel('solution');
  };
  const showSolution = () => {
    if (solutionShown[tab.key] || state.done[ex.id]) return revealSolution();
    ask(
      hintsShown < ex.hints.length
        ? 'Peek at the solution? Try the hints first: struggling a little is how it sticks.'
        : 'Peek at the solution? Struggling a little is how it sticks.',
      'Show solution',
      revealSolution,
    );
  };

  const debugWith = (input) => {
    setStdin(tab.key, input);
    doRun(tab.key, undefined, input);
  };

  const next = ex && getNext ? getNext(tab.key) : null;
  const compilerLabel =
    settings.backend === 'wandbox' ? 'GCC 13.2 · Wandbox' : `${GODBOLT_COMPILERS.find((c) => c.id === settings.compiler)?.label || settings.compiler} · Compiler Explorer`;

  return (
    <div className="ide">
      {tabs.length > 1 && (
        <div className="ide-tabs" role="tablist" aria-label="Editor tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={t.key === tab.key}
              className={`ide-tab${t.key === tab.key ? ' active' : ''}`}
              onClick={() => onSelect(t.key)}
              title={t.title || t.label}
            >
              {t.exercise &&
                (state.done[t.exercise.id] ? (
                  <CircleCheck size={14} className="ok" aria-label="passed" />
                ) : (
                  <span className={`dot ${t.exercise.difficulty || ''}`} aria-hidden="true" />
                ))}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {ex && showPrompt && (
        <div className={`ide-prompt${promptOpen ? ' open' : ''}`}>
          <button className="ide-prompt-toggle" onClick={() => setPromptOpenKey(promptOpen ? null : tab.key)} aria-expanded={promptOpen}>
            <strong>{ex.title}</strong>
            {ex.difficulty && <span className={`diff-badge ${ex.difficulty}`}>{DIFF_LABEL[ex.difficulty]}</span>}
            {state.done[ex.id] && <span className="badge ok">Passed</span>}
            <span className="muted">{promptOpen ? 'Hide task ▴' : 'Show task ▾'}</span>
          </button>
          {promptOpen && <div className="prose small" dangerouslySetInnerHTML={{ __html: renderMarkdown(ex.prompt) }} />}
        </div>
      )}

      <div className="ide-editor">
        <CodeEditor
          value={code}
          onChange={(v) => setCode(tab.key, v)}
          onRun={() => doRun()}
          onCheck={doCheck}
          onView={(v) => (viewRef.current = v)}
          diagnostics={diagnostics}
          fontSize={settings.fontSize}
          theme={settings.theme}
          label={ex ? `Code editor: ${ex.title}` : `Code editor: ${tab.label}`}
        />
        {confirm && (
          <div className="confirm" role="alertdialog" aria-label={confirm.message}>
            <p>{confirm.message}</p>
            <div className="row">
              <button
                className="btn primary"
                autoFocus
                onClick={() => {
                  confirm.action();
                  setConfirm(null);
                }}
              >
                {confirm.label}
              </button>
              <button className="btn ghost" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="ide-toolbar">
        {running ? (
          <button className="btn" onClick={stop}>
            <Square size={15} aria-hidden="true" /> Stop
          </button>
        ) : (
          <button className="btn primary" onClick={() => doRun()} title="Compile & run (Ctrl/⌘ + Enter)">
            <Play size={15} aria-hidden="true" /> Run
          </button>
        )}
        {ex && (
          <button className="btn success" onClick={doCheck} disabled={running} title="Run all tests (Ctrl/⌘ + Shift + Enter)">
            <CheckCheck size={15} aria-hidden="true" /> Check
          </button>
        )}
        {ex && ex.hints.length > 0 && (
          <button className="btn ghost" onClick={showHint} title="Reveal the next hint">
            <Lightbulb size={15} aria-hidden="true" /> <span className="lbl">Hint</span> {hintsShown ? `${Math.min(hintsShown, ex.hints.length)}/${ex.hints.length}` : ''}
          </button>
        )}
        {ex && (
          <button className="btn ghost" onClick={showSolution} title="Show the reference solution">
            <KeyRound size={15} aria-hidden="true" /> <span className="lbl">Solution</span>
          </button>
        )}
        <button className="btn ghost icon" onClick={reset} title={ex ? 'Reset to starter code' : 'Reset this tab'} aria-label={ex ? 'Reset to starter code' : 'Reset this tab'}>
          <RotateCcw size={15} aria-hidden="true" />
        </button>
        <span className="compiler-label" title="Change in Settings">
          {compilerLabel} · {settings.std}
          {settings.sanitizers ? ' · sanitizers' : ''}
        </span>
      </div>

      <div className="ide-bottom">
        <div className="panel-tabs" role="tablist" aria-label="Results">
          <PanelTab id="output" panel={panel} setPanel={setPanel}>
            Output
          </PanelTab>
          <PanelTab id="input" panel={panel} setPanel={setPanel}>
            Input (stdin){stdin.trim() ? ' •' : ''}
          </PanelTab>
          {ex && (
            <PanelTab id="tests" panel={panel} setPanel={setPanel}>
              Tests
              {result?.kind === 'check' && !result.running && result.data?.tests && (
                <span className={`count ${result.data.passed ? 'ok' : 'bad'}`}>
                  {result.data.tests.filter((t) => t?.pass).length}/{ex.tests.length}
                </span>
              )}
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
        <div className="panel-body" role="tabpanel" aria-live={panel === 'output' ? 'polite' : undefined}>
          {panel === 'output' &&
            (!result ? (
              <p className="muted pad">
                Press <strong>Run</strong> (Ctrl/⌘ + Enter) to compile and run your program{ex ? '. Its input comes from the Input tab' : ''}.
              </p>
            ) : result.running && result.kind === 'run' ? (
              <Running />
            ) : result.kind === 'run' ? (
              <ExecResult d={result.data} onJump={jumpTo} />
            ) : (
              <p className="muted pad">See the Tests tab for check results.</p>
            ))}
          {panel === 'input' && (
            <div className="stdin-panel">
              <label className="sr-only" htmlFor={`stdin-${tab.key}`}>
                Program input
              </label>
              <textarea
                id={`stdin-${tab.key}`}
                value={stdin}
                spellCheck={false}
                placeholder="Text typed here is fed to your program's std::cin when you press Run."
                onChange={(e) => setStdin(tab.key, e.target.value)}
              />
            </div>
          )}
          {panel === 'tests' && ex && <TestsPanel ex={ex} result={result} onJump={jumpTo} onDebug={debugWith} next={next} />}
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
                  <Lightbulb size={15} aria-hidden="true" /> Show next hint
                </button>
              ) : (
                <p className="muted">That's all the hints. Still stuck? Peek at the solution.</p>
              )}
            </div>
          )}
          {panel === 'solution' && ex && <SolutionPanel ex={ex} onLoad={() => ask('Replace your code with the solution?', 'Load solution', () => setCode(tab.key, ex.solution))} />}
        </div>
      </div>
    </div>
  );
});

export default Ide;

function PanelTab({ id, panel, setPanel, children }) {
  return (
    <button role="tab" aria-selected={panel === id} className={`panel-tab${panel === id ? ' active' : ''}`} onClick={() => setPanel(id)}>
      {children}
    </button>
  );
}

function SolutionPanel({ ex, onLoad }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="solution">
      <div className="solution-bar">
        <span className="muted">Reference solution. Yours can differ and still be correct. Compare the approach, not the exact text.</span>
        <div className="row">
          <button
            className="btn ghost"
            onClick={() =>
              navigator.clipboard?.writeText(ex.solution).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="btn ghost" onClick={onLoad}>
            Load into editor
          </button>
        </div>
      </div>
      <pre className="hljs">
        <code dangerouslySetInnerHTML={{ __html: highlight(ex.solution) }} />
      </pre>
    </div>
  );
}
