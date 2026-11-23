import { describe, it, expect } from 'vitest';
import { parseDiagnostics, explain, explainOutput, explainExit } from '../diagnostics.js';

const GCC = `main.cpp: In function 'int main()':
main.cpp:4:5: error: expected ',' or ';' before 'std'
    4 |     std::cout << y;
main.cpp:3:9: warning: unused variable 'x' [-Wunused-variable]
main.cpp:7:3: error: 'vector' is not a member of 'std'
main.cpp:1:1: note: 'std::vector' is defined in header '<vector>'`;

describe('parseDiagnostics', () => {
  it('extracts line, column, severity and attaches notes', () => {
    const d = parseDiagnostics(GCC);
    expect(d.map((x) => [x.line, x.col, x.severity])).toEqual([
      [4, 5, 'error'],
      [3, 9, 'warning'],
      [7, 3, 'error'],
    ]);
    expect(d[2].notes[0]).toMatch(/defined in header/);
  });
});

describe('explain', () => {
  it('explains common errors with captured names', () => {
    expect(explain("error: 'vector' is not a member of 'std'")).toMatch(/`std::vector`/);
    expect(explain("error: 'cnt' was not declared in this scope")).toMatch(/`cnt`/);
    expect(explain('something unheard of')).toBeNull();
  });
  it('lists errors before warnings and de-duplicates', () => {
    const out = explainOutput(GCC);
    expect(out[0].severity).toBe('error');
    expect(out.at(-1).severity).toBe('warning');
    expect(out.map((o) => o.line)).toEqual([4, 7, 3]);
  });
  it('explains crash exit codes and sanitizer output', () => {
    expect(explainExit(139)).toMatch(/Segmentation fault/);
    expect(explainExit(136)).toMatch(/division/);
    expect(explainExit(1, '==1==ERROR: AddressSanitizer: heap-buffer-overflow')).toMatch(/sanitizer/);
    expect(explainExit(0)).toBeNull();
  });
});
