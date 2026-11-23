# skill::issue

A personal, interactive C++ course that goes from zero to hero. Read a lesson, then write real C++ in the
built-in IDE. Your code is compiled with GCC and auto-graded against test cases.

- **18 modules** from "what is a compiler" through classes, templates, the STL, lambdas, exceptions,
  move semantics, and concurrency, covering every syntax variation along the way
- **In-browser IDE** (CodeMirror) with Run, Check, hints, solutions, stdin, and compiler errors and warnings
- **Real compiler**: code runs on [Compiler Explorer](https://godbolt.org) (or [Wandbox](https://wandbox.org)
  as a fallback), so no backend of your own is needed
- **No database**: progress, quiz answers, and your code live in your browser's localStorage. Use
  Settings → Export/Import to back up or move devices.

## Run locally

```bash
npm install
npm run dev
```

## Build (static site)

```bash
npm run build
```

`dist/` is a plain static site: host it anywhere (Cloudflare Pages, GitHub Pages, Netlify, or any folder
on a web server). It uses hash routing and relative paths, so no server configuration is needed.

## Writing and changing lessons

Lessons are Markdown files in `content/`. See [CONTENT_GUIDE.md](CONTENT_GUIDE.md) for the format
(runnable examples, exercises with tests, quizzes). After editing, verify that every example compiles and
every exercise solution passes its own tests (needs `g++` 13+):

```bash
npm run verify
```

## Layout

```
content/                 the course (Markdown + module.json per module)
scripts/verify-content.mjs  compiles & tests all content with local g++
src/lib/parse.js         content parser (shared by app and verifier)
src/lib/runner.js        compile/run via Compiler Explorer or Wandbox
src/lib/store.js         localStorage-backed progress store
src/components/          UI: lesson view, IDE, quizzes, sidebar, pages
```
