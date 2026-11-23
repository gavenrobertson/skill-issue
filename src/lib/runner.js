// Compiles and runs C++ using free public compile services, straight from the browser.
// Compiler Explorer (godbolt.org) is the default; Wandbox (wandbox.org) is a fallback.
import { normalizeOutput, runStaticChecks } from './parse.js';

export const GODBOLT_COMPILERS = [
  { id: 'g142', label: 'GCC 14.2' },
  { id: 'g152', label: 'GCC 15.2' },
  { id: 'g132', label: 'GCC 13.2' },
  { id: 'clang2110', label: 'Clang 21.1' },
];
export const STANDARDS = ['c++17', 'c++20', 'c++23'];

// eslint-disable-next-line no-control-regex
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
const joinLines = (arr) => stripAnsi((arr || []).map((l) => l.text).join('\n'));

function flags(settings) {
  const f = [`-std=${settings.std}`, '-O1', '-Wall', '-Wextra', '-pthread', '-fdiagnostics-color=never'];
  if (settings.sanitizers) f.push('-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer');
  return f;
}

async function runGodbolt(source, stdin, settings, signal) {
  const res = await fetch(`https://godbolt.org/api/compiler/${encodeURIComponent(settings.compiler)}/compile`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      source,
      lang: 'c++',
      options: {
        userArguments: flags(settings).join(' '),
        executeParameters: { args: [], stdin: stdin ?? '' },
        compilerOptions: { executorRequest: true },
        filters: { execute: true },
        tools: [],
        libraries: [],
      },
    }),
  });
  if (!res.ok) throw new Error(`Compiler Explorer returned HTTP ${res.status}${res.status === 429 ? ' (rate limited, wait a few seconds)' : ''}`);
  const d = await res.json();
  const build = d.buildResult || {};
  const compileOutput = [joinLines(build.stdout), joinLines(build.stderr)].filter(Boolean).join('\n').replaceAll('/app/example.cpp', 'main.cpp').replaceAll('<source>', 'main.cpp');
  if ((build.code ?? 0) !== 0 || d.didExecute === false) {
    return { compiled: false, compileOutput: compileOutput || joinLines(d.stderr) || 'Compilation failed.' };
  }
  return {
    compiled: true,
    compileOutput,
    stdout: joinLines(d.stdout),
    stderr: joinLines(d.stderr),
    exitCode: d.code,
    timedOut: Boolean(d.timedOut),
    truncated: Boolean(d.truncated),
    execTime: Number(d.execTime) || null,
  };
}

async function runWandbox(source, stdin, settings, signal) {
  const res = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: source,
      compiler: 'gcc-13.2.0',
      options: '',
      'compiler-option-raw': flags({ ...settings, std: settings.std === 'c++23' ? 'c++2b' : settings.std }).join('\n'),
      stdin: stdin ?? '',
      save: false,
    }),
  });
  if (!res.ok) throw new Error(`Wandbox returned HTTP ${res.status}`);
  const d = await res.json();
  const compileOutput = stripAnsi([d.compiler_output, d.compiler_error].filter(Boolean).join('\n')).replace(/prog\.cc/g, 'main.cpp');
  const ran = d.program_output !== undefined || d.program_error !== undefined || /^0$/.test(d.status ?? '');
  if (!ran) return { compiled: false, compileOutput: compileOutput || 'Compilation failed.' };
  return {
    compiled: true,
    compileOutput,
    stdout: d.program_output ?? '',
    stderr: d.program_error ?? '',
    exitCode: d.signal ? null : Number(d.status),
    signal: d.signal || null,
    timedOut: /Killed|SIGKILL/.test(d.signal || ''),
  };
}

/** Compile and run once. Returns a result object; network problems become { error }. */
export async function runCode(source, stdin, settings, signal) {
  const started = performance.now();
  try {
    const fn = settings.backend === 'wandbox' ? runWandbox : runGodbolt;
    const r = await fn(source, stdin, settings, signal);
    return { ...r, wallTime: Math.round(performance.now() - started) };
  } catch (e) {
    if (e.name === 'AbortError') return { aborted: true };
    return { error: e.message === 'Failed to fetch' ? 'Could not reach the compile service. Are you online? (You can switch services in Settings.)' : e.message };
  }
}

/**
 * Run every test for an exercise. Calls onProgress(partialResults) as tests finish.
 * Returns { compileError?, error?, checkFailures, tests: [{pass, stdout, stderr, expected, stdin, exitCode}] , passed }
 */
export async function checkExercise(exercise, source, settings, onProgress, signal) {
  const checkFailures = runStaticChecks(source, exercise.checks);
  const results = exercise.tests.map(() => null);
  const runOne = async (i) => {
    const t = exercise.tests[i];
    const r = await runCode(source, t.stdin, settings, signal);
    if (r.error || r.aborted || !r.compiled) return r;
    const got = normalizeOutput(r.stdout);
    const want = normalizeOutput(t.expected);
    results[i] = {
      ...r,
      stdin: t.stdin,
      expected: t.expected,
      hidden: t.hidden,
      pass: got === want && !r.timedOut && (r.exitCode === 0 || r.exitCode == null),
      outputMatches: got === want,
    };
    onProgress?.({ checkFailures, tests: [...results] });
    return r;
  };

  // First test alone: if it doesn't compile there is no point in running the rest.
  const first = await runOne(0);
  if (first.aborted) return { aborted: true };
  if (first.error) return { error: first.error, checkFailures, tests: results };
  if (!first.compiled) return { compileError: first.compileOutput, checkFailures, tests: results };

  let next = 1;
  const worker = async () => {
    while (next < exercise.tests.length) {
      const i = next++;
      const r = await runOne(i);
      if (r.error) results[i] = { error: r.error, pass: false, stdin: exercise.tests[i].stdin, expected: exercise.tests[i].expected, hidden: exercise.tests[i].hidden };
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  if (signal?.aborted) return { aborted: true };
  const passed = results.every((r) => r?.pass) && checkFailures.length === 0;
  return { checkFailures, tests: results, passed, compileOutput: first.compileOutput };
}
