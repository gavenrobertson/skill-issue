// Loads every lesson in /content at build time. Edit Markdown, refresh, done.
import { buildCourse } from './parse.js';

const files = import.meta.glob(['/content/**/*.md', '/content/**/module.json'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const course = buildCourse(files);
if (course.errors.length) console.warn('Content problems:\n' + course.errors.join('\n'));

export const lessonById = new Map(course.lessons.map((l) => [l.id, l]));
export const moduleBySlug = new Map(course.modules.map((m) => [m.slug, m]));

export function neighbors(lessonId) {
  const i = course.lessons.findIndex((l) => l.id === lessonId);
  return { prev: course.lessons[i - 1] || null, next: course.lessons[i + 1] || null };
}

export const totals = {
  lessons: course.lessons.length,
  exercises: course.lessons.reduce((n, l) => n + l.exercises.length, 0),
  quizzes: course.lessons.reduce((n, l) => n + l.quizzes.length, 0),
};
