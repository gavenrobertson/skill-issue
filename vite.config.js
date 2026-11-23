import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import course from './vite-plugin-course.js';

// base './' + hash routing = the built site works from any static host or sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), course()],
});
