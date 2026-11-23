// All app state lives in the browser (localStorage). No server, no database.
import { useSyncExternalStore } from 'react';

const KEY = 'skill-issue:v1';

export const DEFAULT_SETTINGS = {
  backend: 'godbolt', // 'godbolt' | 'wandbox'
  compiler: 'g142', // Compiler Explorer compiler id
  std: 'c++20',
  sanitizers: false,
  fontSize: 14,
  theme: 'dark',
};

const empty = () => ({
  version: 1,
  done: {}, // exerciseId -> timestamp of first pass
  quiz: {}, // quizId -> { selected: number[], correct: boolean }
  code: {}, // editor key -> source
  stdin: {}, // editor key -> stdin text
  hints: {}, // exerciseId -> number of hints revealed
  visited: {}, // lessonId -> timestamp
  last: null, // last lesson id
  settings: { ...DEFAULT_SETTINGS },
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    return { ...empty(), ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } };
  } catch {
    return empty();
  }
}

let state = load();
const listeners = new Set();
let saveTimer = null;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: progress just won't persist */
    }
  }, 250);
}

export function getState() {
  return state;
}

export function update(fn) {
  const next = fn(state);
  if (next === state) return;
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(selector = (s) => s) {
  return useSyncExternalStore(subscribe, () => selector(state));
}

// ---- actions ----
export const setCode = (key, code) => update((s) => ({ ...s, code: { ...s.code, [key]: code } }));
export const setStdin = (key, text) => update((s) => ({ ...s, stdin: { ...s.stdin, [key]: text } }));
export const markDone = (id) => update((s) => (s.done[id] ? s : { ...s, done: { ...s.done, [id]: Date.now() } }));
export const setQuiz = (id, value) => update((s) => ({ ...s, quiz: { ...s.quiz, [id]: { ...value, at: Date.now() } } }));
export const clearQuiz = (id) =>
  update((s) => {
    const quiz = { ...s.quiz };
    delete quiz[id];
    return { ...s, quiz };
  });
export const revealHint = (id) => update((s) => ({ ...s, hints: { ...s.hints, [id]: (s.hints[id] || 0) + 1 } }));
export const visit = (lessonId) =>
  update((s) => (s.last === lessonId && s.visited[lessonId] ? s : { ...s, last: lessonId, visited: { ...s.visited, [lessonId]: s.visited[lessonId] || Date.now() } }));
export const setSettings = (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

export function exportProgress() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importProgress(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.done) throw new Error('That file is not a Skill Issue progress export.');
  update(() => ({ ...empty(), ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } }));
}

export function resetProgress() {
  update((s) => ({ ...empty(), settings: s.settings }));
}

// ---- derived progress ----

/** Day key (local time) for activity tracking, e.g. "2026-11-23". */
export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Map of day -> number of exercises passed and quizzes answered correctly that day. */
export function activityByDay(s = state) {
  const days = {};
  for (const ts of Object.values(s.done)) days[dayKey(ts)] = (days[dayKey(ts)] || 0) + 1;
  for (const q of Object.values(s.quiz)) if (q.correct && q.at) days[dayKey(q.at)] = (days[dayKey(q.at)] || 0) + 1;
  return days;
}

/** Consecutive days with activity, ending today (or yesterday, so the streak survives until you practice today). */
export function streak(days, now = Date.now()) {
  let n = 0;
  let t = now;
  if (!days[dayKey(t)]) t -= 864e5;
  while (days[dayKey(t)]) {
    n++;
    t -= 864e5;
  }
  return n;
}
export function lessonProgress(lesson, s = state) {
  const items = [...lesson.exercises, ...lesson.quizzes];
  const total = items.length;
  const done = lesson.exercises.filter((e) => s.done[e.id]).length + lesson.quizzes.filter((q) => s.quiz[q.id]?.correct).length;
  const complete = total ? done === total : Boolean(s.visited[lesson.id]);
  return { done, total, complete };
}

export function moduleProgress(mod, s = state) {
  let done = 0;
  let total = 0;
  let lessonsDone = 0;
  for (const l of mod.lessons) {
    const p = lessonProgress(l, s);
    done += p.done;
    total += p.total;
    if (p.complete) lessonsDone++;
  }
  return { done, total, lessonsDone, lessons: mod.lessons.length };
}
