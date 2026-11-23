// Vite plugin: parses the Markdown course at build time.
//   virtual:course         small index (modules, lesson titles, exercise/quiz ids) loaded up front
//   /content/x.md?lesson   one parsed lesson, loaded lazily when it is opened
//   virtual:course-search  full-text search index, loaded when search is first used
import fs from 'node:fs';
import path from 'node:path';
import { buildCourse, parseLesson, stripOrder } from './src/lib/parse.js';

const INDEX = 'virtual:course';
const SEARCH = 'virtual:course-search';

function readContent(root) {
  const dir = path.join(root, 'content');
  const files = {};
  const abs = [];
  for (const folder of fs.readdirSync(dir)) {
    const fdir = path.join(dir, folder);
    if (!fs.statSync(fdir).isDirectory()) continue;
    for (const file of fs.readdirSync(fdir)) {
      if (!file.endsWith('.md') && file !== 'module.json') continue;
      const p = path.join(fdir, file);
      files[`content/${folder}/${file}`] = fs.readFileSync(p, 'utf8');
      abs.push(p);
    }
  }
  return { files, abs };
}

export default function coursePlugin() {
  let root = process.cwd();
  let warned = '';
  const build = (ctx) => {
    const { files, abs } = readContent(root);
    abs.forEach((p) => ctx.addWatchFile(p));
    const course = buildCourse(files);
    const msg = course.errors.join('\n');
    if (msg && msg !== warned) ctx.warn(`Content problems (run npm run verify):\n${msg}`);
    warned = msg;
    return course;
  };

  return {
    name: 'skill-issue-course',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === INDEX || id === SEARCH) return '\0' + id;
    },
    load(id) {
      if (id === '\0' + INDEX) {
        const course = build(this);
        const modules = course.modules.map((m) => ({
          slug: m.slug,
          title: m.title,
          description: m.description,
          index: m.index,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            slug: l.slug,
            moduleSlug: l.moduleSlug,
            title: l.title,
            summary: l.summary,
            index: l.index,
            moduleTitle: l.moduleTitle,
            moduleIndex: l.moduleIndex,
            headings: l.headings,
            exercises: l.exercises.map((e) => ({ id: e.id, title: e.title, difficulty: e.difficulty })),
            quizzes: l.quizzes.map((q) => ({ id: q.id })),
          })),
        }));
        const loaders = course.lessons.map((l) => `${JSON.stringify(l.id)}: () => import(${JSON.stringify(`/content/${l.path}?lesson`)})`);
        return `export const modules = ${JSON.stringify(modules)};\nexport const loaders = {\n${loaders.join(',\n')}\n};\n`;
      }
      if (id === '\0' + SEARCH) {
        const course = build(this);
        const index = Object.fromEntries(course.lessons.map((l) => [l.id, l.searchText]));
        return `export default ${JSON.stringify(index)};`;
      }
      if (id.endsWith('.md?lesson')) {
        const file = id.slice(0, -'?lesson'.length);
        this.addWatchFile(file);
        const src = fs.readFileSync(file, 'utf8');
        const moduleSlug = stripOrder(path.basename(path.dirname(file)));
        const { lesson } = parseLesson(src, moduleSlug, path.basename(file));
        delete lesson.searchText;
        return `export default ${JSON.stringify(lesson)};`;
      }
    },
    handleHotUpdate({ file, server }) {
      if (!file.includes(`${path.sep}content${path.sep}`)) return;
      for (const id of ['\0' + INDEX, '\0' + SEARCH]) {
        const mod = server.moduleGraph.getModuleById(id);
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
