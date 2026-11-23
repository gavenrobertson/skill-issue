// Result panels for the IDE: program output, compiler messages, and test results.
import { Loader2, CircleCheck, CircleX, Bug, ArrowRight, Info } from 'lucide-react';
import { normalizeOutput } from '../lib/parse.js';
import { explainOutput, explainExit } from '../lib/diagnostics.js';

export function Running({ label = 'Compiling & running…' }) {
  return (
    <div className="running" role="status">
      <Loader2 size={16} className="spin" aria-hidden="true" /> {label}
    </div>
  );
}

/** Compiler output with clickable file:line:col locations and plain-language explanations. */
export function CompilerMessages({ text, onJump, failed }) {
  const explanations = explainOutput(text);
  const lines = String(text || '').split('\n');
  return (
    <div className="compiler-messages">
      {explanations.length > 0 && (
        <ul className="explain" aria-label="What this means">
          {explanations.map((e, i) => (
            <li key={i} className={e.severity}>
              <Info size={15} aria-hidden="true" />
              <span>
                {e.line && (
                  <button className="linklike" onClick={() => onJump?.(e.line, 1)}>
                    Line {e.line}
                  </button>
                )}
                {e.line && ': '}
                <InlineCode text={e.text} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <pre className={failed ? 'compile-output' : 'warning-output'}>
        {lines.map((l, i) => {
          const m = l.match(/^(main\.cpp:(\d+):(\d+):)(.*)$/);
          return (
            <span key={i}>
              {m ? (
                <>
                  <button className="loc" onClick={() => onJump?.(Number(m[2]), Number(m[3]))} title="Jump to this line">
                    {m[1]}
                  </button>
                  {m[4]}
                </>
              ) : (
                l
              )}
              {'\n'}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

/** Render `code` spans in short explanation strings without a Markdown dependency. */
function InlineCode({ text }) {
  return text.split(/(`[^`]+`)/g).map((part, i) => (part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : <span key={i}>{part.replace(/\*/g, '')}</span>));
}

export function ExecResult({ d, onJump }) {
  if (d.error)
    return (
      <div className="console error-text" role="alert">
        {d.error}
      </div>
    );
  if (!d.compiled)
    return (
      <div className="console">
        <div className="status bad" role="alert">
          <CircleX size={15} aria-hidden="true" /> Compilation failed
        </div>
        <CompilerMessages text={d.compileOutput} onJump={onJump} failed />
      </div>
    );
  const exitOk = d.exitCode === 0;
  const exitHint = !exitOk ? explainExit(d.exitCode, d.stderr) : null;
  return (
    <div className="console">
      {d.compileOutput?.trim() && (
        <details className="warnings">
          <summary>⚠ Compiler warnings ({(d.compileOutput.match(/warning:/g) || []).length || 1}). Click to read, they often point at real bugs</summary>
          <CompilerMessages text={d.compileOutput} onJump={onJump} />
        </details>
      )}
      <pre className="stdout" aria-label="Program output">
        {d.stdout || <span className="muted">(no output)</span>}
      </pre>
      {d.stderr?.trim() && (
        <pre className="stderr" aria-label="Error output">
          {d.stderr}
        </pre>
      )}
      {exitHint && (
        <p className="exit-hint">
          <Bug size={15} aria-hidden="true" /> <InlineCode text={exitHint} />
        </p>
      )}
      <div className={`exit ${exitOk ? '' : 'bad'}`}>
        {d.timedOut ? 'Timed out (an infinite loop, or waiting for input that never came?)' : d.signal ? `Killed by ${d.signal}` : `Exited with code ${d.exitCode}`}
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

function diffHint(diff) {
  if (diff.got == null) return 'Your output is missing lines at the end.';
  if (diff.want == null) return 'Your output has extra lines at the end.';
  if (diff.got.trim() === diff.want.trim()) return 'Only spacing differs. Check spaces at the start of the line or between values.';
  if (diff.got.toLowerCase() === diff.want.toLowerCase()) return 'Only capitalization differs.';
  if (diff.got.replace(/\s+/g, '') === diff.want.replace(/\s+/g, '')) return 'Only whitespace differs. Check the spaces between values.';
  return null;
}

export function TestsPanel({ ex, result, onJump, onDebug, next }) {
  if (!result || result.kind !== 'check')
    return (
      <p className="muted pad">
        Press <strong>Check</strong> (Ctrl/⌘ + Shift + Enter) to run your code against {ex.tests.length} test{ex.tests.length === 1 ? '' : 's'}
        {ex.tests.some((t) => t.hidden) ? ', some of them hidden' : ''}.
      </p>
    );
  const d = result.running ? result.progress : result.data;
  if (d.error)
    return (
      <div className="console error-text" role="alert">
        {d.error}
      </div>
    );
  if (d.compileError)
    return (
      <div className="console">
        <div className="status bad" role="alert">
          <CircleX size={15} aria-hidden="true" /> Compilation failed
        </div>
        <CompilerMessages text={d.compileError} onJump={onJump} failed />
      </div>
    );
  const tests = d.tests || [];
  const passedCount = tests.filter((t) => t?.pass).length;
  const firstFail = tests.findIndex((x) => x && !x.pass);
  return (
    <div className="tests">
      <div aria-live="polite">
        {result.running ? (
          <Running label={`Running tests… ${tests.filter(Boolean).length}/${ex.tests.length}`} />
        ) : d.passed ? (
          <div className="passed-banner">
            <div className="status good big">
              <CircleCheck size={18} aria-hidden="true" /> {tests.length === 1 ? 'Test passed' : `All ${tests.length} tests passed`}. Nice work!
            </div>
            {next && (
              <button className="btn primary" onClick={next.run}>
                {next.label} <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div className="status bad">
            <CircleX size={15} aria-hidden="true" /> {passedCount}/{tests.length} tests passed{d.checkFailures?.length ? ', and some requirements are not met' : ''}
          </div>
        )}
      </div>
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
          <details key={i} className={`test ${t.pass ? 'pass' : 'fail'}`} open={i === firstFail}>
            <summary>
              {t.pass ? <CircleCheck size={14} aria-label="passed" /> : <CircleX size={14} aria-label="failed" />} Test {i + 1}
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
                {!t.pass &&
                  !t.hidden &&
                  (() => {
                    const diff = firstDiff(t.stdout, t.expected);
                    if (!diff) return null;
                    const hint = diffHint(diff);
                    return (
                      <p className="diff">
                        First difference on line {diff.line}: expected <code>{JSON.stringify(diff.want ?? '(nothing)')}</code>, got{' '}
                        <code>{JSON.stringify(diff.got ?? '(nothing)')}</code>
                        {hint && <span className="diff-hint"> {hint}</span>}
                      </p>
                    );
                  })()}
                {!t.pass && (t.exitCode ?? 0) !== 0 && explainExit(t.exitCode, t.stderr) && (
                  <p className="exit-hint">
                    <Bug size={15} aria-hidden="true" /> <InlineCode text={explainExit(t.exitCode, t.stderr)} />
                  </p>
                )}
                {!t.pass && (
                  <button className="btn ghost small-btn" onClick={() => onDebug(t.stdin)}>
                    <Bug size={14} aria-hidden="true" /> Run with this input
                  </button>
                )}
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
