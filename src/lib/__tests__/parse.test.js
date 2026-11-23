import { describe, it, expect } from 'vitest';
import { splitFences, splitContainers, parseLesson, buildCourse, normalizeOutput, runStaticChecks, stripComments, slugify, headingId } from '../parse.js';

const fence = (lang, body) => '```' + lang + '\n' + body + '\n```';

const LESSON = [
  '---',
  'title: Sample Lesson',
  'summary: Short summary.',
  '---',
  '',
  '## First section',
  '',
  fence('cpp run', '#include <iostream>\nint main() { std::cout << "hi\\n"; }'),
  '',
  fence('output', 'hi'),
  '',
  fence('cpp', '// ## not a heading\n:::exercise not a container'),
  '',
  ':::exercise Add Two {hard}',
  'Read two ints and print the sum.',
  '',
  fence('cpp starter', 'int main() {}'),
  fence('cpp solution', '#include <iostream>\nint main() { int a, b; std::cin >> a >> b; std::cout << a + b; }'),
  fence('hint', 'Use `>>`.'),
  fence('stdin', '1 2'),
  fence('expected', '3'),
  fence('stdin', '-1 1'),
  fence('expected hidden', '0'),
  fence('checks', 'must std::cin :: Use std::cin.\nmustnot printf :: No printf.'),
  ':::',
  '',
  ':::quiz',
  'Pick the even numbers.',
  '- [x] `2`',
  '- [ ] `3`',
  '- [x] `4`',
  '',
  'Even numbers are divisible by two.',
  ':::',
].join('\n');

describe('splitFences', () => {
  it('separates text and fenced blocks with language and meta', () => {
    const parts = splitFences('a\n```cpp run\nx\n```\nb');
    expect(parts.map((p) => p.type)).toEqual(['text', 'fence', 'text']);
    expect(parts[1]).toMatchObject({ lang: 'cpp', meta: 'run', code: 'x' });
  });
  it('supports longer fences containing shorter ones', () => {
    const parts = splitFences('````md\n```cpp\nx\n```\n````');
    expect(parts).toHaveLength(1);
    expect(parts[0].code).toBe('```cpp\nx\n```');
  });
});

describe('splitContainers', () => {
  it('ignores ::: markers inside code fences', () => {
    const segs = splitContainers(fence('cpp', ':::exercise nope\n:::') + '\n:::quiz\nQ\n- [x] a\n- [ ] b\n:::');
    expect(segs.map((s) => s.kind)).toEqual(['prose', 'quiz']);
  });
  it('flags unterminated containers', () => {
    const segs = splitContainers(':::exercise Open\nbody');
    expect(segs[0].unterminated).toBe(true);
  });
});

describe('parseLesson', () => {
  const { lesson, errors } = parseLesson(LESSON, 'mod', '03-sample.md');

  it('parses metadata and stable ids without the order prefix', () => {
    expect(errors).toEqual([]);
    expect(lesson).toMatchObject({ id: 'mod/sample', title: 'Sample Lesson', summary: 'Short summary.' });
  });

  it('parses an exercise with difficulty, tests, hints and checks', () => {
    const [ex] = lesson.exercises;
    expect(ex).toMatchObject({ id: 'mod/sample/add-two', title: 'Add Two', difficulty: 'hard' });
    expect(ex.tests).toEqual([
      { stdin: '1 2', expected: '3', hidden: false },
      { stdin: '-1 1', expected: '0', hidden: true },
    ]);
    expect(ex.hints).toEqual(['Use `>>`.']);
    expect(ex.checks.map((c) => c.type)).toEqual(['must', 'mustnot']);
    expect(ex.prompt).toContain('Read two ints');
  });

  it('parses a multi-answer quiz with explanation', () => {
    const [q] = lesson.quizzes;
    expect(q.options.map((o) => o.correct)).toEqual([true, false, true]);
    expect(q.explanation).toBe('Even numbers are divisible by two.');
  });

  it('attaches output fences to runnable examples', () => {
    expect(lesson.examples).toHaveLength(1);
    expect(lesson.examples[0]).toMatchObject({ mode: 'run', output: 'hi' });
  });

  it('collects headings outside code fences only', () => {
    expect(lesson.headings).toEqual([{ text: 'First section', id: 'first-section' }]);
  });

  it('reports structural problems', () => {
    const bad = parseLesson('---\ntitle: X\n---\n:::exercise Broken\nno code\n:::', 'm', 'x.md');
    expect(bad.errors.join('\n')).toMatch(/missing cpp solution/);
    expect(bad.errors.join('\n')).toMatch(/no tests/);
  });
});

describe('buildCourse', () => {
  it('orders modules and lessons by numeric prefix and skips empty modules', () => {
    const course = buildCourse({
      'content/02-b/module.json': '{"title":"B"}',
      'content/02-b/01-x.md': '---\ntitle: X\n---\nhi',
      'content/01-a/module.json': '{"title":"A"}',
      'content/01-a/02-z.md': '---\ntitle: Z\n---\nhi',
      'content/01-a/01-y.md': '---\ntitle: Y\n---\nhi',
      'content/03-empty/module.json': '{"title":"Empty"}',
    });
    expect(course.modules.map((m) => m.title)).toEqual(['A', 'B']);
    expect(course.lessons.map((l) => l.id)).toEqual(['a/y', 'a/z', 'b/x']);
    expect(course.lessons[1]).toMatchObject({ index: 2, moduleIndex: 1, moduleTitle: 'A' });
  });
});

describe('output comparison and static checks', () => {
  it('ignores trailing whitespace and trailing blank lines only', () => {
    expect(normalizeOutput('a  \r\nb\t\n\n')).toBe('a\nb');
    expect(normalizeOutput(' a')).toBe(' a');
  });
  it('strips comments and string contents before checking', () => {
    expect(stripComments('x; // for (\n/* while */ "for (;;)"')).not.toMatch(/for|while/);
    expect(runStaticChecks('for (;;) {}', [{ type: 'must', pattern: '\\bfor\\s*\\(', message: 'need for' }])).toEqual([]);
    expect(runStaticChecks('// for (', [{ type: 'must', pattern: '\\bfor\\s*\\(', message: 'need for' }])).toEqual(['need for']);
    expect(runStaticChecks('printf("x")', [{ type: 'mustnot', pattern: 'printf', message: 'no printf' }])).toEqual(['no printf']);
  });
  it('slugifies titles predictably', () => {
    expect(slugify('C++ Strings & You!')).toBe('cpp-strings-you');
    expect(headingId('The `switch` statement')).toBe('the-switch-statement');
  });
});
