// The course index is small and loaded up front; each lesson's full content is
// parsed at build time (vite-plugin-course.js) and fetched when it is opened.
import { modules, loaders } from 'virtual:course';

const lessons = modules.flatMap((m) => m.lessons);
export const course = { modules, lessons };
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const moduleBySlug = new Map(modules.map((m) => [m.slug, m]));

export const allExercises = lessons.flatMap((l) => l.exercises.map((e, i) => ({ ...e, n: i + 1, lesson: l })));

export function neighbors(lessonId) {
  const i = lessons.findIndex((l) => l.id === lessonId);
  return { prev: lessons[i - 1] || null, next: lessons[i + 1] || null };
}

export const totals = {
  lessons: lessons.length,
  exercises: allExercises.length,
  quizzes: lessons.reduce((n, l) => n + l.quizzes.length, 0),
};

const cache = new Map();
/** Full lesson (blocks, exercises with tests, quizzes). Cached; safe to call repeatedly. */
export function loadLesson(id) {
  if (!loaders[id]) return Promise.reject(new Error(`Unknown lesson ${id}`));
  if (!cache.has(id)) {
    const p = loaders[id]().then((m) => ({ ...m.default, ...lessonById.get(id), exercises: m.default.exercises, quizzes: m.default.quizzes }));
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id);
}

let searchIndex = null;
export function loadSearchIndex() {
  searchIndex ??= import('virtual:course-search').then((m) => m.default);
  return searchIndex;
}
