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

Live at **https://skill-issue.gaven-robertson.workers.dev** (Cloudflare Workers static assets).

### Deploying

Every push to `main` runs CI (lint, formatting, unit tests, build, content verification) and, if it all
passes, deploys the site to Cloudflare automatically (`.github/workflows/ci.yml`, job `deploy`). A failed
check never deploys. You can also deploy `main` by hand from the repo's **Actions → CI → Run workflow**.

One-time setup: add a repository secret named `CLOUDFLARE_API_TOKEN` (GitHub → Settings → Secrets and
variables → Actions) holding a Cloudflare API token made from the **Edit Cloudflare Workers** template.

From your own machine you can also deploy directly with `npm run deploy` (the first time, `npx wrangler login`).

`dist/` is a plain static site: host it anywhere (Cloudflare Pages, GitHub Pages, Netlify, or any folder
on a web server). It uses hash routing and relative paths, so no server configuration is needed.

## Development

```bash
npm run dev        # local dev server with hot reload (lesson edits reload the page)
npm test           # unit tests (parser, grader, diagnostics, progress, runner)
npm run lint       # ESLint
npm run format     # Prettier
npm run check      # everything CI runs: lint, format, tests, build, content verification
```

CI (`.github/workflows/ci.yml`) runs `npm run check` on every push.

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
vite-plugin-course.js    parses content at build time: small index + one lazy chunk per lesson
src/lib/parse.js         content parser (shared by app, build plugin and verifier)
src/lib/diagnostics.js   compiler messages -> editor squiggles + plain-English explanations
src/lib/runner.js        compile/run via Compiler Explorer or Wandbox
src/lib/store.js         localStorage-backed progress store
src/components/          UI: lesson view, IDE, quizzes, sidebar, dialogs
src/pages/               Home, Practice, Playground, Settings
```
