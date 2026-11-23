// Content parser shared by the browser app and scripts/verify-content.mjs.
// Pure JS: no Vite- or Node-specific APIs. See CONTENT_GUIDE.md for the format.

const FENCE_OPEN = /^(`{3,})\s*([^\s`]*)\s*(.*)$/;

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/\+\+/g, 'pp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Strip a leading "NN-" ordering prefix from a file/folder name. */
export function stripOrder(name) {
  return name.replace(/^\d+[-_]/, '').replace(/\.md$/, '');
}

export function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: src.slice(m[0].length) };
}

/**
 * Split markdown into fenced code blocks and text, line by line.
 * Returns [{type:'text', text}, {type:'fence', lang, meta, code, raw}]
 */
export function splitFences(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let buf = [];
  let i = 0;
  const flush = () => {
    if (buf.length) out.push({ type: 'text', text: buf.join('\n') });
    buf = [];
  };
  while (i < lines.length) {
    const m = lines[i].match(FENCE_OPEN);
    if (m) {
      const ticks = m[1];
      const body = [];
      let j = i + 1;
      const isClose = (l) => /^`+$/.test(l.trim()) && l.trim().length >= ticks.length;
      while (j < lines.length && !isClose(lines[j])) {
        body.push(lines[j]);
        j++;
      }
      flush();
      out.push({
        type: 'fence',
        lang: m[2] || '',
        meta: (m[3] || '').trim(),
        code: body.join('\n'),
        raw: lines.slice(i, Math.min(j + 1, lines.length)).join('\n'),
      });
      i = j + 1;
    } else {
      buf.push(lines[i]);
      i++;
    }
  }
  flush();
  return out;
}

/**
 * Split a lesson body into segments: prose markdown, :::exercise and :::quiz containers.
 * Container markers inside fenced code are ignored.
 */
export function splitContainers(body) {
  const lines = body.split(/\r?\n/);
  const segs = [];
  let buf = [];
  let inFence = null;
  let container = null; // {kind, title, lines}
  const flushProse = () => {
    if (buf.length) segs.push({ kind: 'prose', md: buf.join('\n') });
    buf = [];
  };
  for (const line of lines) {
    const fence = line.match(/^(`{3,})/);
    if (fence) {
      if (!inFence) inFence = fence[1];
      else if (/^`+$/.test(line.trim()) && line.trim().length >= inFence.length) inFence = null;
    }
    if (!inFence && !fence) {
      const open = line.match(/^:::(exercise|quiz)\b\s*(.*)$/);
      if (open && !container) {
        flushProse();
        container = { kind: open[1], title: open[2].trim(), lines: [] };
        continue;
      }
      if (line.trim() === ':::' && container) {
        segs.push({ kind: container.kind, title: container.title, md: container.lines.join('\n') });
        container = null;
        continue;
      }
    }
    (container ? container.lines : buf).push(line);
  }
  if (container) {
    segs.push({ kind: container.kind, title: container.title, md: container.lines.join('\n'), unterminated: true });
  }
  flushProse();
  return segs;
}

function parseChecks(text) {
  const checks = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^(must|mustnot)\s+(.+?)\s+::\s+(.+)$/);
    if (!m) {
      checks.push({ error: `Bad check line: ${t}` });
      continue;
    }
    checks.push({ type: m[1], pattern: m[2], message: m[3] });
  }
  return checks;
}

export function parseExercise(seg, lessonId, errors) {
  const parts = splitFences(seg.md);
  const ex = {
    kind: 'exercise',
    title: seg.title || 'Exercise',
    id: `${lessonId}/${slugify(seg.title || 'exercise')}`,
    prompt: '',
    starter: '',
    solution: '',
    hints: [],
    tests: [],
    checks: [],
  };
  const prompt = [];
  let pendingStdin = null;
  for (const p of parts) {
    if (p.type === 'text') {
      prompt.push(p.text);
      continue;
    }
    const key = `${p.lang} ${p.meta}`.trim();
    if (p.lang === 'cpp' && /^starter\b/.test(p.meta)) {
      ex.starter = p.code;
      ex.starterBroken = /\bbroken\b/.test(p.meta);
    } else if (key === 'cpp solution') ex.solution = p.code;
    else if (p.lang === 'hint') ex.hints.push(p.code);
    else if (p.lang === 'stdin') pendingStdin = p.code;
    else if (p.lang === 'expected') {
      ex.tests.push({ stdin: pendingStdin ?? '', expected: p.code, hidden: /\bhidden\b/.test(p.meta) });
      pendingStdin = null;
    } else if (p.lang === 'checks') {
      for (const c of parseChecks(p.code)) {
        if (c.error) errors.push(`${ex.id}: ${c.error}`);
        else ex.checks.push(c);
      }
    } else prompt.push(p.raw);
  }
  ex.prompt = prompt.join('\n').trim();
  if (pendingStdin !== null) errors.push(`${ex.id}: stdin block without a following expected block`);
  if (!ex.solution) errors.push(`${ex.id}: missing cpp solution`);
  if (!ex.starter) errors.push(`${ex.id}: missing cpp starter`);
  if (!ex.tests.length) errors.push(`${ex.id}: no tests`);
  if (seg.unterminated) errors.push(`${ex.id}: missing closing :::`);
  return ex;
}

export function parseQuiz(seg, lessonId, index, errors) {
  const lines = seg.md.split(/\r?\n/);
  const question = [];
  const options = [];
  const explanation = [];
  let inFence = false;
  let phase = 'q';
  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const opt = !inFence && line.match(/^- \[( |x|X)\]\s+(.*)$/);
    if (opt && phase !== 'e') {
      phase = 'o';
      options.push({ text: opt[2], correct: opt[1].toLowerCase() === 'x' });
      continue;
    }
    if (phase === 'q') question.push(line);
    else if (line.trim() || explanation.length) {
      phase = 'e';
      explanation.push(line.replace(/^>\s?/, ''));
    }
  }
  const id = `${lessonId}/quiz-${index + 1}`;
  if (options.length < 2) errors.push(`${id}: quiz needs at least 2 options`);
  if (!options.some((o) => o.correct)) errors.push(`${id}: quiz has no correct option`);
  if (seg.unterminated) errors.push(`${id}: missing closing :::`);
  return {
    kind: 'quiz',
    id,
    title: seg.title,
    question: question.join('\n').trim(),
    options,
    explanation: explanation.join('\n').trim(),
  };
}

/**
 * Parse one lesson markdown file.
 * @returns {{lesson, errors}}
 */
export function parseLesson(src, moduleSlug, fileName) {
  const errors = [];
  const { meta, body } = parseFrontmatter(src);
  const slug = stripOrder(fileName);
  const id = `${moduleSlug}/${slug}`;
  const segs = splitContainers(body);
  const blocks = [];
  let quizIndex = 0;
  const examples = [];
  for (const seg of segs) {
    if (seg.kind === 'prose') {
      blocks.push({ kind: 'prose', md: seg.md });
      for (const p of splitFences(seg.md)) {
        if (p.type === 'fence' && p.lang === 'cpp' && /\b(run|compile-error)\b/.test(p.meta)) {
          examples.push({
            code: p.code,
            mode: /\bcompile-error\b/.test(p.meta) ? 'compile-error' : 'run',
            warns: /\bwarns\b/.test(p.meta),
          });
        }
      }
    } else if (seg.kind === 'exercise') blocks.push(parseExercise(seg, id, errors));
    else blocks.push(parseQuiz(seg, id, quizIndex++, errors));
  }
  if (!meta.title) errors.push(`${id}: missing title in frontmatter`);
  const ids = new Set();
  for (const b of blocks) {
    if (b.id && ids.has(b.id)) errors.push(`${b.id}: duplicate id (titles must be unique within a lesson)`);
    if (b.id) ids.add(b.id);
  }
  const text = body.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`:-]/g, ' ');
  return {
    lesson: {
      id,
      slug,
      moduleSlug,
      title: meta.title || slug,
      summary: meta.summary || '',
      blocks,
      exercises: blocks.filter((b) => b.kind === 'exercise'),
      quizzes: blocks.filter((b) => b.kind === 'quiz'),
      examples,
      searchText: `${meta.title || ''} ${text}`.toLowerCase(),
    },
    errors,
  };
}

/**
 * Build the course from a map of path -> raw string.
 * Paths look like ".../content/02-variables/03-literals.md" and ".../content/02-variables/module.json".
 */
export function buildCourse(files) {
  const modules = new Map();
  const errors = [];
  const paths = Object.keys(files).sort();
  for (const path of paths) {
    const m = path.match(/content\/([^/]+)\/([^/]+)$/);
    if (!m) continue;
    const [, folder, file] = m;
    const slug = stripOrder(folder);
    if (!modules.has(slug)) modules.set(slug, { slug, folder, title: slug, description: '', lessons: [] });
    const mod = modules.get(slug);
    if (file === 'module.json') {
      try {
        Object.assign(mod, JSON.parse(files[path]));
      } catch (e) {
        errors.push(`${folder}/module.json: ${e.message}`);
      }
    } else if (file.endsWith('.md')) {
      const { lesson, errors: errs } = parseLesson(files[path], slug, file);
      lesson.path = `${folder}/${file}`;
      mod.lessons.push(lesson);
      errors.push(...errs.map((e) => `${folder}/${file}: ${e}`));
    }
  }
  const list = [...modules.values()].sort((a, b) => a.folder.localeCompare(b.folder));
  list.forEach((mod, mi) => {
    mod.index = mi + 1;
    mod.lessons.forEach((l, li) => {
      l.index = li + 1;
      l.moduleTitle = mod.title;
    });
  });
  const lessons = list.flatMap((mod) => mod.lessons);
  return { modules: list, lessons, errors };
}

/** Normalize program output for comparison: trim trailing spaces per line and trailing blank lines. */
export function normalizeOutput(s) {
  return String(s ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/** Remove // and /* *\/ comments and string literal contents (rough) for static checks. */
export function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, '')
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
}

export function runStaticChecks(code, checks) {
  const clean = stripComments(code);
  const failures = [];
  for (const c of checks) {
    let re;
    try {
      re = new RegExp(c.pattern, 'm');
    } catch {
      continue;
    }
    const hit = re.test(clean);
    if (c.type === 'must' && !hit) failures.push(c.message);
    if (c.type === 'mustnot' && hit) failures.push(c.message);
  }
  return failures;
}
