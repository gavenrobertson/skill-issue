#!/usr/bin/env node
// Verifies course content with the local g++:
//  - every lesson parses (frontmatter, exercises, quizzes)
//  - every ```cpp run example compiles and runs
//  - every ```cpp compile-error example FAILS to compile
//  - every exercise solution compiles warning-free, passes all tests and static checks
//  - every exercise starter compiles (warning only)
//
// Usage: node scripts/verify-content.mjs [path-filter ...] [--quiet]
//   e.g. node scripts/verify-content.mjs content/05-control-flow
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus, tmpdir } from 'node:os';
import { buildCourse, normalizeOutput, runStaticChecks } from '../src/lib/parse.js';

const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const filters = args.filter((a) => !a.startsWith('--')).map((f) => f.replace(/^\.?\/?/, '').replace(/\/$/, ''));
const CXX = process.env.CXX || 'g++';
const FLAGS = ['-std=c++20', '-Wall', '-Wextra', '-O1', '-pthread'];
const work = join(tmpdir(), 'skill-issue-verify');
mkdirSync(work, { recursive: true });

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const files = {};
for (const p of walk(join(root, 'content'))) {
  if (p.endsWith('.md') || p.endsWith('module.json')) files[relative(root, p)] = readFileSync(p, 'utf8');
}
const course = buildCourse(files);

const matches = (lessonPath) => !filters.length || filters.some((f) => `content/${lessonPath}`.startsWith(f) || lessonPath.startsWith(f));

const problems = [];
const warnings = [];
for (const e of course.errors) {
  const path = e.split(':')[0];
  if (matches(path)) problems.push(`PARSE ${e}`);
}

function compile(code) {
  const h = createHash('sha1').update(code).digest('hex').slice(0, 16);
  const src = join(work, `${h}.cpp`);
  const bin = join(work, `${h}.out`);
  const log = join(work, `${h}.log`);
  if (existsSync(bin) && existsSync(log)) return { ok: true, bin, stderr: readFileSync(log, 'utf8'), cached: true };
  writeFileSync(src, code);
  return new Promise((resolve) => {
    const p = spawn(CXX, [...FLAGS, '-fdiagnostics-color=never', src, '-o', bin]);
    let stderr = '';
    p.stderr.on('data', (d) => (stderr += d));
    p.on('close', (code) => {
      if (code === 0) writeFileSync(log, stderr);
      resolve({ ok: code === 0, bin, stderr });
    });
  });
}

function run(bin, stdin) {
  const r = spawnSync(bin, [], { input: stdin, timeout: 5000, encoding: 'utf8', maxBuffer: 4 << 20 });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status, signal: r.signal, timedOut: r.error?.code === 'ETIMEDOUT' };
}

const jobs = [];
let exampleCount = 0;
let exerciseCount = 0;
let quizCount = 0;
for (const lesson of course.lessons) {
  if (!matches(lesson.path)) continue;
  quizCount += lesson.quizzes.length;
  lesson.examples.forEach((ex, i) => {
    exampleCount++;
    jobs.push(async () => {
      const where = `${lesson.path} example #${i + 1}`;
      const c = await compile(ex.code);
      if (ex.mode === 'compile-error') {
        if (c.ok) problems.push(`${where}: marked compile-error but it COMPILES`);
        return;
      }
      if (!c.ok) return problems.push(`${where}: does not compile\n${indent(c.stderr)}`);
      if (c.stderr.trim() && !ex.warns) warnings.push(`${where}: compiler warnings\n${indent(c.stderr)}`);
      const r = run(c.bin, '');
      if (r.timedOut) problems.push(`${where}: timed out (examples must finish without input)`);
      else if (r.signal) warnings.push(`${where}: crashed with ${r.signal}`);
    });
  });
  for (const ex of lesson.exercises) {
    exerciseCount++;
    jobs.push(async () => {
      const where = `${lesson.path} exercise "${ex.title}"`;
      const c = await compile(ex.solution);
      if (!c.ok) return problems.push(`${where}: solution does not compile\n${indent(c.stderr)}`);
      if (c.stderr.trim()) warnings.push(`${where}: solution has warnings\n${indent(c.stderr)}`);
      ex.tests.forEach((t, ti) => {
        const r = run(c.bin, t.stdin);
        const got = normalizeOutput(r.stdout);
        const want = normalizeOutput(t.expected);
        if (r.timedOut) problems.push(`${where} test #${ti + 1}: timed out`);
        else if (got !== want) problems.push(`${where} test #${ti + 1}: output mismatch\n  stdin:\n${indent(t.stdin)}\n  expected:\n${indent(want)}\n  got:\n${indent(got)}`);
        else if (r.status !== 0) problems.push(`${where} test #${ti + 1}: exit code ${r.status ?? r.signal}`);
      });
      const failed = runStaticChecks(ex.solution, ex.checks);
      if (failed.length) problems.push(`${where}: solution fails its own checks: ${failed.join('; ')}`);
      for (const ck of ex.checks) {
        try {
          new RegExp(ck.pattern, 'm');
        } catch (e) {
          problems.push(`${where}: invalid check regex ${ck.pattern}: ${e.message}`);
        }
      }
      if (ex.starter.trim()) {
        const s = await compile(ex.starter);
        if (!s.ok && !ex.starterBroken) warnings.push(`${where}: starter does not compile (mark it \`cpp starter broken\` if intentional)\n${indent(s.stderr)}`);
        else if (s.ok && ex.starterBroken) warnings.push(`${where}: starter is marked broken but compiles`);
        if (s.ok && ex.tests.length && ex.tests.every((t) => normalizeOutput(run(s.bin, t.stdin).stdout) === normalizeOutput(t.expected)))
          problems.push(`${where}: starter ALREADY passes all tests`);
      }
    });
  }
}

function indent(s) {
  return String(s)
    .split('\n')
    .slice(0, 25)
    .map((l) => `    ${l}`)
    .join('\n');
}

const pool = Math.max(2, cpus().length);
let next = 0;
await Promise.all(
  Array.from({ length: pool }, async () => {
    while (next < jobs.length) await jobs[next++]();
  }),
);

if (!quiet) for (const w of warnings) console.log(`WARN  ${w}`);
for (const p of problems) console.log(`FAIL  ${p}`);
console.log(
  `\nChecked ${exampleCount} examples, ${exerciseCount} exercises, ${quizCount} quizzes in ${course.lessons.filter((l) => matches(l.path)).length} lessons: ${problems.length} failures, ${warnings.length} warnings.`,
);
process.exit(problems.length ? 1 : 0);
