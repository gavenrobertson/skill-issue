import { describe, it, expect } from 'vitest';
import { dayKey, streak, activityByDay, lessonProgress } from '../store.js';

const DAY = 864e5;
const noon = new Date(2026, 10, 23, 12).getTime();

describe('activity and streaks', () => {
  it('counts consecutive days ending today or yesterday', () => {
    const days = { [dayKey(noon)]: 1, [dayKey(noon - DAY)]: 2, [dayKey(noon - 3 * DAY)]: 1 };
    expect(streak(days, noon)).toBe(2);
    expect(streak({ [dayKey(noon - DAY)]: 1 }, noon)).toBe(1); // not broken until today ends
    expect(streak({ [dayKey(noon - 2 * DAY)]: 1 }, noon)).toBe(0);
  });
  it('aggregates passes and correct quizzes by day', () => {
    const s = { done: { a: noon, b: noon }, quiz: { q: { correct: true, at: noon }, r: { correct: false, at: noon } } };
    expect(activityByDay(s)).toEqual({ [dayKey(noon)]: 3 });
  });
});

describe('lessonProgress', () => {
  const lesson = { id: 'm/l', exercises: [{ id: 'e1' }, { id: 'e2' }], quizzes: [{ id: 'q1' }] };
  it('counts exercises and correct quizzes', () => {
    const s = { done: { e1: 1 }, quiz: { q1: { correct: true } }, visited: {} };
    expect(lessonProgress(lesson, s)).toEqual({ done: 2, total: 3, complete: false });
  });
  it('treats a lesson with nothing to do as complete once visited', () => {
    expect(lessonProgress({ id: 'x', exercises: [], quizzes: [] }, { done: {}, quiz: {}, visited: { x: 1 } }).complete).toBe(true);
  });
});
