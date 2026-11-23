import { describe, it, expect, vi, afterEach } from 'vitest';
import { runCode, checkExercise } from '../runner.js';

const settings = { backend: 'godbolt', compiler: 'g142', std: 'c++20', sanitizers: false };
const text = (s) => s.split('\n').map((t) => ({ text: t }));

/** Fake Compiler Explorer: "compiles" by echoing stdin doubled, or failing when source contains BROKEN. */
function fakeGodbolt({ failFirst = 0 } = {}) {
  let calls = 0;
  return vi.fn(async (_url, init) => {
    calls++;
    if (calls <= failFirst) return { ok: false, status: 429, json: async () => ({}) };
    const body = JSON.parse(init.body);
    if (body.source.includes('BROKEN'))
      return { ok: true, status: 200, json: async () => ({ code: -1, didExecute: false, buildResult: { code: 1, stderr: text("<source>:2:5: error: expected ';' before 'x'") } }) };
    const n = Number(body.options.executeParameters.stdin);
    return { ok: true, status: 200, json: async () => ({ code: 0, didExecute: true, stdout: text(String(n * 2)), stderr: [], buildResult: { code: 0, stderr: [] } }) };
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('runCode', () => {
  it('returns program output and the compiled source', async () => {
    vi.stubGlobal('fetch', fakeGodbolt());
    const r = await runCode('int main(){}', '21', settings);
    expect(r).toMatchObject({ compiled: true, stdout: '42', exitCode: 0, source: 'int main(){}' });
  });
  it('reports compile errors with file names rewritten to main.cpp', async () => {
    vi.stubGlobal('fetch', fakeGodbolt());
    const r = await runCode('BROKEN', '', settings);
    expect(r.compiled).toBe(false);
    expect(r.compileOutput).toMatch(/^main\.cpp:2:5: error/);
  });
  it('retries when rate limited', async () => {
    vi.useFakeTimers();
    const fetch = fakeGodbolt({ failFirst: 1 });
    vi.stubGlobal('fetch', fetch);
    const p = runCode('int main(){}', '1', settings);
    await vi.runAllTimersAsync();
    expect((await p).stdout).toBe('2');
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('checkExercise', () => {
  const ex = {
    tests: [
      { stdin: '1', expected: '2', hidden: false },
      { stdin: '5', expected: '10', hidden: true },
      { stdin: '0', expected: '1', hidden: false },
    ],
    checks: [{ type: 'must', pattern: 'main', message: 'Need main' }],
  };
  it('runs every test and reports which pass', async () => {
    vi.stubGlobal('fetch', fakeGodbolt());
    const r = await checkExercise(ex, 'int main(){}', settings);
    expect(r.tests.map((t) => t.pass)).toEqual([true, true, false]);
    expect(r.passed).toBe(false);
  });
  it('stops after a compile error', async () => {
    const fetch = fakeGodbolt();
    vi.stubGlobal('fetch', fetch);
    const r = await checkExercise(ex, 'int main(){} BROKEN', settings);
    expect(r.compileError).toMatch(/error/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('fails when static checks fail even if output matches', async () => {
    vi.stubGlobal('fetch', fakeGodbolt());
    const r = await checkExercise({ ...ex, tests: ex.tests.slice(0, 2) }, 'int f(){}', settings);
    expect(r.tests.every((t) => t.pass)).toBe(true);
    expect(r.passed).toBe(false);
    expect(r.checkFailures).toEqual(['Need main']);
  });
});
