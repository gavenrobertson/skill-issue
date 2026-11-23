// Tiny hash router: works on any static host with no server config.
import { useSyncExternalStore } from 'react';

const subscribe = (cb) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}

export function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'learn' && parts.length >= 3) return { page: 'lesson', lessonId: `${parts[1]}/${parts[2]}` };
  if (parts[0] === 'playground') return { page: 'playground' };
  if (parts[0] === 'settings') return { page: 'settings' };
  return { page: 'home' };
}

export const lessonHref = (lesson) => `#/learn/${lesson.id}`;
export const go = (href) => {
  window.location.hash = href.replace(/^#/, '');
};
